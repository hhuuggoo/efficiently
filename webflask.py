import gevent
import gevent.monkey
gevent.monkey.patch_all()
from geventwebsocket.handler import WebSocketHandler
import uuid
import pymongo
from pymongo.errors import DuplicateKeyError
import bson.objectid
import bcrypt
import json
import numpy as np
import hashlib
import sys
import numpy as np
import logging
import time
import json
import os
import urlparse
import stripe

import os.path
import websocket
import auth

can_read = auth.can_read
can_write = auth.can_write

logging.basicConfig(level=logging.DEBUG)

from flask import (request, g, session,
                   redirect, render_template, Flask,
                   flash, jsonify, Response)

from app import app
keypath = os.path.join(os.environ['HOME'], "keys.json")
with open(keypath) as f:
    data = f.read()
    keys = json.loads(data)
stripe.api_key = keys["STRIPE_SECRET"]
    
def send_email(fromaddr, toaddrs, subject, txtdata):
    from boto.ses import SESConnection
    connection = SESConnection(
        aws_access_key_id=keys["AWS_ACCESS_KEY"],
        aws_secret_access_key=keys["AWS_SECRET_KEY"])
    connection.send_email(fromaddr, subject, txtdata, toaddrs)
    
def prepare_app(app):
    conn = pymongo.Connection()
    db = conn['task']
    db.user.ensure_index([('username',1)], unique=True)
    app.db = db
    app.wsmanager = websocket.WebSocketManager()
    app.wsmanager.register_auth("docrw", auth.docrw_auth)
    app.wsmanager.register_auth("docr", auth.docr_auth)
    
def getid():
    #seems overly complex
    return hashlib.sha1(
        str(bson.objectid.ObjectId()) + str(np.random.random())
        ).hexdigest()

def doc_mongo_to_app(d, username=None):
    if username is None:
        username = d['username']
    assert username
    assert 'root_id' in d
    assert '_id' in d
    return {'id' : str(d['_id']),
            'root_id':d.get('root_id'),
            'title' : d.get('title', ''),
            'username' : username,
            'todostates' : d.get('todostates',[]),
            'todocolors' : d.get('todocolors', {}),
            'status': d.get('status', 'ACTIVE'),
            'rwuser': d.get('rwuser', []),
            'ruser': d.get('ruser', []),
            'rwemail': d.get('rwemail', []),
            'remail': d.get('remail', []),
            }

def doc_app_to_mongo(d, username=None):
    if username is None:
        username = d['username']
    assert 'root_id' in d
    assert 'id' in d
    return {'_id' : str(d['id']),
            'root_id':d.get('root_id'),
            'title' : d.get('title', ''),
            'username' : username,
            'todostates' : d.get('todostates',[]),
            'todocolors' : d.get('todocolors', {}),
            'status': d.get('status', 'ACTIVE'),
            'rwuser': d.get('rwuser', []),
            'ruser': d.get('ruser', []),
            'rwemail': d.get('rwemail', []),
            'remail': d.get('remail', []),
            }

def save_doc(d, db):
    id_val = d.pop('_id')
    db.document.update({'_id': id_val}, {'$set' : d}, upsert=True, safe=True)

def outline_mongo_to_app(d):
    assert 'documentid' in d
    return {'id' : str(d['_id']),
            'text' : d.get('text', ''),
            'children' : d.get('children', []),
            'parent': d.get('parent', None),
            'documentid': d.get('documentid'),
            'status' : d.get('status', 'ACTIVE'),
            'chidden' : d.get('chidden', False)}

def outline_app_to_mongo(d):
    assert 'documentid' in d
    return {'_id' : d['id'],
            'text' : d.get('text', ''),
            'children' : d.get('children', []),
            'parent': d.get('parent', None),
            'documentid': d.get('documentid'),
            'status' : d.get('status', 'ACTIVE'),
            'chidden' : d.get('chidden', False),
            }

def save_outline(d, db):
    id_val = d.pop('_id')
    db.outline.update({'_id': id_val}, {'$set' : d}, upsert=True, safe=True)

def create_document(user, title, db):
    docid =  getid()
    rootid = docid + "-" + getid()
    
    docid = db.document.insert(
        {'_id' : docid,
         'root_id' : rootid,
         'username':user,
         'title': title,
         'todostates' : ["TODO", "INPROGRESS", "DONE"],
         'todocolors': {'TODO' : 'red',
                        'INPROGRESS': 'red',
                        'DONE' : 'green'},
         'status': 'ACTIVE'
         },
        safe=True)
    objid = db.outline.insert({
        '_id' : rootid,
        'username':user,
        'documentid' : docid}, safe=True)
    return docid

    
def create_initial_data(user, passwd, email, title, db):
    salt = bcrypt.gensalt()
    passhash = bcrypt.hashpw(str(passwd), str(salt))
    docid = create_document(user, title, db)
    db.user.insert({'username':user,
                    'salt' : salt,
                    'passhash':passhash,
                    'email':email,
                    'defaultdoc' : docid
                    }, safe=True)
                        
#handler if we are indexing elems by list name            
def separate_orphans(root_id, nodes):
    dictnodes = {}
    for n in nodes:
        dictnodes[n['id']] = n
    root = dictnodes[root_id]
    traverse_ids = set()
    def traverse(x):
        traverse_ids.add(x['id'])
        children = x['children']
        for c in children:
            traverse (dictnodes[c])
    traverse(root)
    good_nodes = []
    for traversed_ids in traverse_ids:
        good_nodes.append(dictnodes.pop(traversed_ids))
    print(traverse_ids)
    print([x['id'] for x in good_nodes])
    print(dictnodes.values())
    for node in dictnodes.values():
        node['status'] = 'TRASH'
        node['children'] = []
        node['parent'] = []
        save_outline(outline_app_to_mongo(node))
    for node in good_nodes:
        node['status'] = 'ACTIVE'
        save_outline(outline_app_to_mongo(node))
    return good_nodes, dictnodes.values()


@app.route("/")
def defaultpage():
    if not session.get('username'):
        return redirect("/login")
    document = None
    if session.get('sharelinks'):
        results = process_shares(
            session.get('username'),
            session.pop('sharelinks'),
            app.db)
        results = [x for x in results if x]
        if results[-1]:
            document = app.db.document.find_one({'_id' : results[-1]['docid']})
            mode = results[-1]['mode']
            return redirect("/docview/%s/%s" %(mode, document['_id']))
            
    user = app.db.user.find_one({'username' : session.get('username')})
    if not document and user.get('defaultdoc'):
        document = app.db.document.find_one({'_id': user['defaultdoc'],
                                             'status' : 'ACTIVE'
                                             })
    if not document or not can_write(document, session.get('username')):
        document = app.db.document.find_one(
            {'username' : session.get('username'),
             'status' : 'ACTIVE'
             }
            )
    if not document or not can_write(document, session.get('username')):
        docid = create_document(session.get('username'), 'Main', app.db)
        document = app.db.document.find_one({'_id': docid,
                                             'status' : 'ACTIVE'
                                             })        
    return redirect("/docview/rw/" + document['_id'])

@app.route("/register", methods=["POST"])
def register():
    username = request.form['username']
    if "," in username or username == "all":
        flash("invalid username", "error")
        return defaultpage()
    password = request.form['password']
    email = request.form['email']
    try:
        create_initial_data(username, password, email, 'Main', app.db)
    except DuplicateKeyError as e:
        flash("there is already an account with this name", "error")
        return defaultpage()
        
    session['username'] = username
    return defaultpage()

@app.route("/login", methods=["GET"])
def splash():
    return render_template("splash.html",
                           user=None,
                           document_id=None,
                           mode=None,
                           )

@app.route("/login", methods=["POST"])
def loginpost():
    username = request.form['username']
    password = request.form['password']
    user_dict = app.db.user.find_one({'username' : username})
    if bcrypt.hashpw(str(password), str(user_dict['salt'])) == user_dict['passhash']:
        session['username'] = username
    else:
        flash("invalid username or password", "error")
    if session.get('next'):
        return redirect(session.pop('next'))
    else:
        return defaultpage()

@app.route("/logout")
def logout():
    session['username'] = None
    return redirect("/login")



def get_own_docdatas(username, db, docid):
    otherdocs = db.document.find(
        {'username': username,
         'status':'ACTIVE',
         '_id' : {'$ne' : docid}}
        )
    docdatas = []
    for doc in otherdocs:
        docdatas.append(
            {'docurl' : "/docview/rw/" + doc['_id'],
             'doctitle' : doc['title']}
            )
    return docdatas

def get_r_docdatas(username, db, docid):
    otherdocs = db.document.find(
        {'ruser' : username,
         'status':'ACTIVE',
         '_id' : {'$ne' : docid}}
        )
    docdatas = []
    for doc in otherdocs:
        docdatas.append(
            {'docurl' : "/docview/r/" + doc['_id'],
             'doctitle' : doc['title']}
            )
    return docdatas

def get_rw_docdatas(username, db, docid):
    otherdocs = db.document.find(
        {'rwuser' : username,
         'status':'ACTIVE',
         '_id' : {'$ne' : docid}}
        )
    docdatas = []
    for doc in otherdocs:
        docdatas.append(
            {'docurl' : "/docview/rw/" + doc['_id'],
             'doctitle' : doc['title']}
            )
    return docdatas

    
topid =  0
@app.route("/docview/<mode>/<docid>/")
def docview(mode, docid):
    global topid
    topid += 1
    username = session.get('username')
    #FIXME should show error page if doc is invalid/missing
    user = app.db.user.find_one({'username' : session.get('username')})
    plan = stripe_plan(user)
    document = app.db.document.find_one({'_id' : docid, 'status' : 'ACTIVE'})
    if not document :
        flash("invalid document", "error")
        return redirect("/login")
    document = doc_mongo_to_app(document)
    if not username:
        docdatas = []
        rdocdatas = []
        rwdocdatas = []
    else:
        docdatas = get_own_docdatas(username, app.db, None)
        rdocdatas = get_r_docdatas(username, app.db,
                                   document['id'])
        rwdocdatas = get_rw_docdatas(username, app.db,
                                     document['id'])
    if (mode == 'rw' and can_write(document, username)) \
       or (mode =='r' and can_read(document, username)):
        if username and mode == 'rw':
            user = app.db.user.find_one({'username' : username})            
            app.db.user.update({'_id' : user['_id']},
                               {'$set' : {'defaultdoc' : document['id']}},
                               safe=True)
        return render_template(
            "outline.html",
            key=keys["STRIPE_PUBLIC"],
            plan=plan,
            root_id=document['root_id'],
            document_id=document['id'],
            user=username,
            title=document['title'],
            owner=document['username'],
            mode=mode,
            client_id=topid,
            docdatas=docdatas,
            rdocdatas=rdocdatas,
            rwdocdatas=rwdocdatas,
            display_share_form=True,
            showdocs=True
            )
    else:
        if username:
            flash("you are not authorized to view that outline", "error")
            return redirect("/login")
        else:
            flash("please login", "error")
            session['next'] = request.path
            return redirect("/login")
        return 


@app.route("/document/<docid>")
def document(docid):
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document)
    if can_read(document, session.get('username')):
        outline = app.db.outline.find({'documentid': docid,
                                       'status' : {'$ne' : 'DELETE'}})
        outline = list(outline)
        logging.debug("numoutlines %d", len(outline))
        outline = [outline_mongo_to_app(e) for e in outline]
        token = auth.auth_token(session.get('username'), app.secret_key)
        split = urlparse.urlsplit(request.url)
        if split.scheme == "http":
            wsurl = "ws://%s/sub" % split.netloc
        else:
            #hack
            wsurl = "wss://%s:9000/sub" % split.netloc
        return jsonify(document=document,
                       outline=outline,
                       token=token,
                       wsurl=wsurl
                       )
    else:
        return redirect("/login")

@app.route("/create", methods=['POST'])
def create():
    if not session.get('username'):
        return redirect("/login")
    user = app.db.user.find_one({'username' : session.get('username')})
    plan = stripe_plan(user)
    if not plan:
        num_docs = len(get_own_docdatas(session.get('username'), 
                                        app.db, None))
        if num_docs >= 5:
            flash("You have reached the limit for free plans.  To create more outlines, please delete an existing outline, or upgrade your plan")
            return redirect(request.referrer)
    title = request.form['title']
    docid = create_document(session.get('username'), title, app.db)
    return redirect("/docview/rw/" + docid)

@app.route("/bulk/<docid>", methods=["POST"])
def bulk(docid):
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document)
    if can_write(document, session.get('username')):
        data = json.loads(request.form['data'])
        clientid = request.headers.get('WS-Clientid')
        to_broadcast = []        
        for dtype, objects in data.iteritems():
            for k, d in objects.iteritems():
                if dtype == 'outline':
                    to_broadcast.append(d)
                    d = outline_app_to_mongo(d)
                    save_outline(d, app.db)
        try:
            msg = json.dumps({
                'msgtype' : 'modelupdate',
                'outline' : to_broadcast
                })
            logging.debug("sending %s", msg)
            app.wsmanager.send("docrw:%s" % docid, msg, exclude=[clientid])
            app.wsmanager.send("docr:%s" % docid, msg, exclude=[clientid])
        except Exception as e:
            logging.exception(e)
        return "success"
    else:
        return redirect("/login")

@app.route("/import/<docid>", methods=["POST"])
def docimportpost(docid):
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document)
    if can_write(document, session.get('username')):
        outlines = update_db_from_txt(request.form['data'], docid)
        return redirect("/docview/rw/" + docid)

@app.route("/import/<docid>", methods=["GET"])
def docimportget(docid):
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document)
    if can_write(document, session.get('username')):
        return render_template("import.html",
                               docid=docid,
                               user=session.get('username'))
    else:
        return redirect("/login")

    
@app.route("/export/<docid>", methods=["GET"])
def docexport(docid):
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document)
    if can_read(document, session.get('username')):
        doc = app.db.document.find_one({'_id' : docid})
        doc = doc_mongo_to_app(doc)
        return Response(doc_to_text(doc),
                        mimetype="text/plain")
    else:
        return redirect("/login")

def stripe_customer(user, create=False):
    stripe_cust_id = user.get('stripe_customer', None)
    if stripe_cust_id:
        customer = stripe.Customer.retrieve(stripe_cust_id)
    elif create:
        customer = stripe.Customer.create(description=user['username'])
        app.db.user.update({'_id' : user['_id']},
                           {'$set' : {'stripe_customer' : customer['id']}},
                           safe=True)
    else:
        return None
    return customer

def stripe_plan(user):
    customer = stripe_customer(user)
    plan_id = None
    if customer and customer.subscription:
        plan_id = customer.subscription.plan.id
    return plan_id

@app.route("/settings/downgrade", methods=["POST"])
def downgrade():
    if request.values.get('confirmcancel', None):
        user = app.db.user.find_one({'username' : session.get('username')})
        customer = stripe_customer(user)
        customer.cancel_subscription()
        flash("You have cancelled your subscription =(", "info")
    else:
        flash("Are you sure you want to cancel your subscription? Please confirm the checkbox", "error")
    return redirect(request.referrer)

@app.route("/settings/upgrade", methods=["POST"])
def upgrade():
    user = app.db.user.find_one({'username' : session.get('username')})
    customer = stripe_customer(user, create=True)
    customer.card = request.values['stripeToken']
    customer.save()
    if request.values['optionsplan'] == "monthly":
        plan_id = "efficientlybasic"
    elif request.values['optionsplan'] == "yearly":
        plan_id = "efficientlybasicannual"
    customer.update_subscription(plan=plan_id)
    flash("Thanks for subscribing!", "info")
    return redirect(request.referrer)

@app.route("/settings/<docid>", methods=["GET"])
def settingsget(docid):
    session['docid'] = docid
    if not session.get('username'):
        return redirect("/login")
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document)
    user = app.db.user.find_one({'username' : session.get('username')})
    plan_id = stripe_plan(user)
    if plan_id == "efficientlybasic":
        plan = 'monthly plan'
    elif plan_id == "efficientlybasicannual":
        plan = 'yearly plan'
    else:
        plan = None
        
    if can_write(document, session.get('username')):
        return render_template(
            "settings.html",
            key=keys["STRIPE_PUBLIC"],
            plan=plan,
            can_write=True,
            rwusers=", ".join(document['rwuser'] + document['rwemail']),
            rusers=", ".join(document['ruser'] + document['remail']),
            title=document['title'],
            document_id=document['id'],
            user=session.get('username')
            )
    else:
        return render_template(
            "settings.html",
            key=keys["STRIPE_PUBLIC"],
            plan=plan,
            can_write=False,
            )
def send_share_email(shareinfo):
    msg = \
"""You have been invited too %s the document %s on Efficiently.
Please visit the following link, %s
"""
    url = request.host_url + "share/" + shareinfo['temphash']    
    if shareinfo['mode'] == 'rw':
        msg = msg % ('edit', shareinfo['title'], url)
    else:
        msg = msg % ('view', shareinfo['title'], url)
    send_email("info@eff.iciently.com", [shareinfo['email']],
               "Someone has shared a document with you",
               msg)

def makeshare(docid, email, mode, title, db):
    temphash = getid()
    shareinfo = {'temphash' : temphash,
                 'timestamp' : time.time(),
                 'mode' : mode,
                 'docid' : docid,
                 'email' : email,
                 'title' : title
                 }
    db.sharelinks.insert(shareinfo,
                         safe=True
                         )
    return shareinfo
    
def process_share(username, temphash, use_flash, db):
    shareinfo = db.sharelinks.find_one({'temphash' : temphash})
    document = app.db.document.find_one({'_id' : shareinfo['docid']})
    if shareinfo['mode'] == 'rw':
        field = 'rwuser'
    else:
        field = 'ruser'
    if username in document[field]:
        return shareinfo
    if not shareinfo:
        flash("invalid shared link", "error")
        return False
    if (time.time() - shareinfo['timestamp']) > 259200.0:
        flash("link expired", "error")
        return False
    app.db.document.update(
        {'_id' : shareinfo['docid']},
        {'$addToSet' : {field : username}},
        safe=True
        )
    return shareinfo
        
def process_shares(username, temphashes, db):
    results = []
    for temphash in temphashes:
        results.append(process_share(username, temphash, False, db))
    return results

@app.route("/loginorregister")
def loginorregister():
    return render_template("loginorregister.html")

@app.route("/share/<temphash>")
def share(temphash):
    if session.get('username'):
        result = process_share(session.get('username'), temphash,
                               True, app.db)
        if result:
            return redirect(
                "/docview/%s/%s" % (result['mode'], result['docid'])
                )
        else:
            return redirect("/login")
    else:
        session.setdefault('sharelinks', []).append(temphash)
        return render_template("loginorregister.html")

@app.route("/addtoshare/<docid>", methods=["POST"])
def addtoshare(docid):
    if not session.get('username'):
        return redirect("/login")
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document)
    rwemail = []
    rwuser = []
    remail = []
    ruser = []
    if request.form.get('rwuser'):
        rwuser = [x.strip() for x in request.form['rwuser'].split(",")]
        rwemail = [x for x in rwuser if "@" in x and x]
        rwuser = [x for x in rwuser if "@" not in x and x]
        newemails = np.setdiff1d(rwemail, document['rwemail'])
        if len(newemails) > 0:
            for email in newemails:
                shareinfo = makeshare(docid, email, 'rw',
                                      document['title'], app.db)
                send_share_email(shareinfo)
        document['rwemail'] += rwemail
        document['rwuser'] += rwuser
    if request.form.get('ruser'):
        ruser = [x.strip() for x in request.form['ruser'].split(",")]
        remail = [x for x in ruser if "@" in x]
        ruser = [x for x in ruser if "@" not in x]
        newemails = np.setdiff1d(remail, document['remail'])
        if len(newemails) > 0:
            for email in newemails:
                shareinfo = makeshare(docid, email, 'r',
                                      document['title'], app.db)
                send_share_email(shareinfo)
        document['remail'] += remail
        document['ruser'] += ruser
    msg = ""
    if rwemail or rwuser:
        msg = msg + "You've invited %s to edit this outline."
        msg = msg % ", ".join(rwemail + rwuser)
    if remail or ruser:
        msg = msg + "You've invited %s to view this outline."
        msg = msg % ", ".join(remail + ruser)
    if msg:
        flash(msg, "success")
    document = doc_app_to_mongo(document)
    save_doc(document, app.db)
    return redirect("/docview/rw/" + docid)

@app.route("/docsettings/<docid>", methods=["POST"])
def docsettingspost(docid):
    if not session.get('username'):
        return redirect("/login")
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document)
    if can_write(document, session.get('username')):
        docupdate = {}
        if request.form.get('delete', False):
            app.db.document.update({'_id' : docid},
                                   {'$set' : {'status' : 'DELETE'}})
            return redirect("/")
        if request.form.get('title'):
            document['title'] = request.form['title']
        if request.form.get('rwuser'):
            rwuser = [x.strip() for x in request.form['rwuser'].split(",")]
            rwemail = [x for x in rwuser if "@" in x and x]
            rwuser = [x for x in rwuser if "@" not in x and x]
            newemails = np.setdiff1d(rwemail, document['rwemail'])
            if len(newemails) > 0:
                for email in newemails:
                    shareinfo = makeshare(docid, email, 'rw',
                                          document['title'], app.db)
                    send_share_email(shareinfo)
            document['rwemail'] = rwemail
            document['rwuser'] = rwuser
        else:
            document['rwemail'] = []
            document['rwuser'] = []
            
        if request.form.get('ruser'):
            ruser = [x.strip() for x in request.form['ruser'].split(",")]
            remail = [x for x in ruser if "@" in x]
            ruser = [x for x in ruser if "@" not in x]
            newemails = np.setdiff1d(remail, document['remail'])
            if len(newemails) > 0:
                for email in newemails:
                    shareinfo = makeshare(docid, email, 'r',
                                          document['title'], app.db)
                    send_share_email(shareinfo)
            document['remail'] = remail
            document['ruser'] = ruser
        else:
            document['remail'] = []
            document['ruser'] = []
        document = doc_app_to_mongo(document)
        save_doc(document, app.db)
    return redirect("/settings/" + docid)

@app.route("/usersettings", methods=["POST"])
def usersettings():
    #FIXME setup flash messages for errors, look into dict shield
    #for validation
    user = app.db.user.find_one({'username' : session.get('username')})
    updates = {}
    if not session.get('username'):
        return redirect("/login")
    if request.form.get('password'):
        password = request.form.get('password')
        password2 = request.form.get('password2')
        if password != password2:
            flash("passwords do not match", "error")
            return redirect("/settings/" + session.get('docid'))
        salt = bcrypt.gensalt()
        passhash = bcrypt.hashpw(password, salt)
        updates['salt'] = salt
        updates['passhash'] = passhash
        flash("password changed", "info")
    if request.form.get('email'):
        email = request.form.get('email')
        updates['email'] = email
        flash("email changed", "info")        
    app.db.user.update({'_id' : user['_id']},
                       {'$set' : updates},
                       safe=True)
    return redirect("/settings/" + session.get('docid'))

def update_db_from_txt(txt, docid, prefix="*"):
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document)
    nodes = outlines_from_text(txt, document['username'],
                               docid, prefix=prefix)
    add_to_root = []
    for n in nodes:
        if n['parent'] is None:
            n['parent'] = document['root_id']
            add_to_root.append(n['id'])
    print add_to_root
    for n in nodes:
        n = outline_app_to_mongo(n)
        data = "parent: %s id: %s txt: %s children: %s" % (str(n['parent']), str(n['_id']), str(n['text']), str(n['children']))
        print data
        save_outline(n, app.db)
    app.db.outline.update({'_id' : document['root_id']},
                      {'$pushAll' : {'children' : add_to_root}},
                      safe=True)
    root = app.db.outline.find_one({'_id' : document['root_id']})
    root = outline_mongo_to_app(root)
    nodes.insert(0, root)
    return nodes
    
def outlines_from_text(txt, user, docid, prefix="*"):
    def bare_outline(txt, user, docid):
        return {'id' : getid(),
                'text' : txt, 
                'username' : user,
                'children' : [],
                'parent': None,
                'documentid': docid,
                'status' : 'ACTIVE'}
    def prefix_count(txtentry):
        non_prefix_idx =  np.nonzero(np.array(list(txtentry)) == prefix)[0]
        if len(non_prefix_idx) == 0:
            return 0
        else:
            return non_prefix_idx[-1] + 1
        
    if not txt.startswith(prefix):
        return [bare_outline(txt, user, docid)]
    outlines = {}
    outline_order = []
    node_order = []

    for idx, line in enumerate(txt.splitlines()):
        if not line.startswith(prefix):
            continue
        level = prefix_count(line)
        logging.debug("level %s", level)
        node = bare_outline(line[level:], user, docid)

        outlines[node['id']] = node
        outline_order.append(node)
        if len(node_order) == 0:
            node_order.append((level, node))
        else:
            node_levels = np.array([x[0] for x in node_order])
            node_parent_idx = np.nonzero(node_levels < level)[0]
            logging.debug('parent %s', str(node_parent_idx))
            if len(node_parent_idx) == 0:
                node_order = [(level, node)]
                continue
            else:
                node_parent_idx = node_parent_idx[-1]
            del node_order[node_parent_idx + 1:]
            node_order[-1][1]['children'].append(node['id'])
            node['parent'] = node_order[-1][1]['id']
            node_order.append((level, node))
    for n in outline_order:
        data = "parent: %s id: %s txt: %s children: %s" % (str(n['parent']), str(n['id']), str(n['text']), str(n['children']))
        print data
    return outline_order

def doc_to_text(document, prefix="*"):
    outlines = app.db.outline.find({'documentid': document['id'],
                                'status' : {'$ne' : 'DELETE'}})
    outline_dict = {}
    for o in outlines:
        o = outline_mongo_to_app(o)
        outline_dict[o['id']] = o
    root = outline_dict[document['root_id']]
    output = node_to_text(outline_dict, root, prefix=prefix)
    logging.debug(output)
    return output

def node_to_text(outlines, outline, prefix="*", level=0):
    output = "".join(["*" for x in range(level)])
    output += ' '
    output += outline['text']

    children_txt = [node_to_text(outlines, outlines[x], 
                                 prefix=prefix, level=level+1)
                    for x in outline['children']]
    total_txt = [output]
    total_txt.extend(children_txt)
    return "\r\n".join(total_txt)

@app.route("/heartbeat", methods=['POST'])
def heartbeat():
    session.setdefault('id', str(uuid.uuid4()))
    gevent.sleep(10)
    clientid = request.headers.get('WS-Clientid')    
    print clientid
    return 'success'

if __name__ == "__main__":
    import sys
    if sys.argv[1] == 'debug':
        prepare_app(app)
        app.secret_key="asdfa;lkja;sdlkfja;sdf"
        app.debug=True
        app.run(port=10000)
    elif sys.argv[1] == 'socket':
        prepare_app(app)
        app.secret_key="asdfa;lkja;sdlkfja;sdf"
        app.debug=True
        from gevent.pywsgi import WSGIServer
        http_server = WSGIServer(('', 10000), app,
                                 handler_class=WebSocketHandler,
                                 )
        import werkzeug.serving
        @werkzeug.serving.run_with_reloader
        def helper():
            http_server.serve_forever()
    elif sys.argv[1] == 'prod':
        prepare_app(app)
        app.secret_key="asdfa;lkja;sdlkfja;sdf"
        app.debug=False
        from gevent.pywsgi import WSGIServer
        http_server = WSGIServer(('', 9000), app,
                                 handler_class=WebSocketHandler,
                                 keyfile="/etc/nginx/server.key",
                                 certfile="/etc/nginx/server.crt"
                                 )
        http_server.serve_forever()
