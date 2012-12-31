import gevent
import gevent.monkey
import pymongo
import bson.objectid
import bcrypt
import cjson
import numpy as np
import hashlib
import sys
import numpy as np
import logging
logging.basicConfig(level=logging.DEBUG)

gevent.monkey.patch_all()
from flask import (app, request, g, session,
                   redirect, render_template, Flask,
                   flash, jsonify)

app = Flask(__name__)

def prepare_app(app):
    conn = pymongo.Connection()
    db = conn['task']
    db.user.ensure_index([('username',1)], unique=True)
    app.db = db
    
def getid():
    #seems overly complex
    return hashlib.sha1(
        str(bson.objectid.ObjectId()) + str(np.random.random())
        ).hexdigest()

def doc_mongo_to_app(d, user):
    assert 'root_id' in d
    assert '_id' in d
    return {'id' : str(d['_id']),
            'root_id':d.get('root_id'),
            'title' : d.get('title', ''),
            'username' : user,
            'todostates' : d.get('todostates',[]),
            'todocolors' : d.get('todocolors', {}),
            'status': d.get('status', 'ACTIVE'),
            'rwuser': d.get('rwuser', []),
            'ruser': d.get('ruser', []),
            }
def doc_app_to_mongo(d, user):
    assert 'root_id' in d
    assert '_id' in d
    return {'_id' : str(d['_id']),
            'root_id':d.get('root_id'),
            'title' : d.get('title', ''),
            'username' : user,
            'todostates' : d.get('todostates',[]),
            'todocolors' : d.get('todocolors', {}),
            'status': d.get('status', 'ACTIVE'),
            'rwuser': d.get('rwuser', []),
            'ruser': d.get('ruser', []),
            }

def save_doc(d):
    id_val = d.pop('_id')
    db.document.update({'_id': id_val}, {'$set' : d}, upsert=True, safe=True)

def outline_mongo_to_app(d, user):
    assert 'documentid' in d
    return {'id' : str(d['_id']),
            'text' : d.get('text', ''),
            'username' : user,
            'children' : d.get('children', []),
            'parent': d.get('parent', None),
            'documentid': d.get('documentid'),
            'status' : d.get('status', 'ACTIVE'),
            'chidden' : d.get('chidden', False)}

def outline_app_to_mongo(d, user):
    assert 'documentid' in d
    return {'_id' : d['id'],
            'text' : d.get('text', ''),
            'username' : user,
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
    salt = bcrypt.gensalt(log_rounds=7)
    passhash = bcrypt.hashpw(passwd, salt)
    docid = create_document(user, title)
    db.user.insert({'username':user,
                    'salt' : salt,
                    'passhash':passhash,
                    'email':email,
                    'defaultdoc' : docid
                    }, safe=True)
                        
#handler if we are indexing elems by list name            
def separate_orphans(root_id, nodes, user):
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
        save_outline(outline_app_to_mongo(node, user))
    for node in good_nodes:
        node['status'] = 'ACTIVE'
        save_outline(outline_app_to_mongo(node, user))
    return good_nodes, dictnodes.values()


@app.route("/")
def defaultpage():
    if not session.get('username'):
        return redirect("/login")
    user = app.db.user.find_one({'username' : session.get('username')})
    if not user.get('defaultdoc'):
        document = app.db.document.find_one(
            {'username' : session.get('username')}
            )
        app.db.user.update({'_id' : user['_id']},
                           {'$set' : {'defaultdoc' : document['_id']}},
                           safe=True)
    else:
        document = app.db.document.find_one({'_id': user['defaultdoc']})
    return redirect("/docview/rw/" + document['_id'])

@app.route("/register", methods=["POST"])
def register():
    username = request.form['username']
    assert "," not in username
    assert username != 'all'
    password = request.form('password')
    email = request.form('email')
    create_initial_data(username, password, email, 'Main')
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
    if bcrypt.hashpw(password, user_dict['salt']) == user_dict['passhash']:
        session['username'] = username
    else:
        flash("invalid username or password", "error")
    return defaultpage()

@app.route("/logout")
def logout():
    session['username'] = None

def can_read(document, username):
    valid_users = set()
    valid_users.update(document['rwuser'])
    valid_users.update(document['ruser'])        
    valid_users.add(document['username'])
    return 'all' in valid_users or session.get('username') in valid_users

def can_write(document, username):
    valid_users = set()
    valid_users.update(document['rwuser'])
    valid_users.add(document['username'])
    return 'all' in valid_users or session.get('username') in valid_users

        
topid =  0
@app.route("/docview/<mode>/<docid>/")
def docview(mode, docid):
    global topid
    topid += 1
    if not session.get('username'):
        return redirect("/login")
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document, session.get('username'))
    otherdocs = app.db.document.find(
        {'username':session.get('username'),
         'status':'ACTIVE',
         '_id' : {'$ne' : docid}}
        )
    docdatas = []
    for doc in otherdocs:
        docdatas.append(
            {'docurl' : "/docview/rw/" + doc['_id'],
             'doctitle' : doc['title']}
            )
    if mode == 'rw' and can_write(document, session.get('username')):
        return render_template(
            "outline.html",
            root_id=document['root_id'],
            document_id=document['id'],
            user=session.get('username'),
            title=document['title'],
            owner=document['username'],
            mode='rw',
            client_id=topid,
            docdatas=docdatas
            )
    elif mode =='r' and can_read(document, session.get('username')):
        return render_template(
            "outline.html",
            root_id=document['root_id'],
            document_id=document['id'],
            user=session.get('username'),
            title=document['title'],
            owner=document['username'],
            mode='r',
            client_id=topid,
            docdatas=docdatas
            )

@app.route("/document/<docid>")
def document(docid):
    if not session.get('username'):
        return redirect("/login")
    document = app.db.document.find_one({'_id' : docid})
    document = doc_mongo_to_app(document, session.get('username'))
    if can_read(document, session.get('username')):
        document = app.db.document.find_one({'_id' : docid})
        document = doc_mongo_to_app(document, session.get('username'))
        outline = app.db.outline.find({'documentid': docid,
                                   'username': session.get('username'),
                                   'status' : {'$ne' : 'DELETE'}})
        outline = list(outline)
        logging.debug("numoutlines %d", len(outline))
        outline = [outline_mongo_to_app(e, session.get('username'))
                   for e in outline]
        return jsonify(document=document,
                       outline=outline)

if __name__ == "__main__":
    prepare_app(app)
    app.secret_key="asdfa;lkja;sdlkfja;sdf"
    app.debug=True
    app.run(port=9000)
