import tornado
import tornado.httpserver
import tornado.ioloop
import tornado.web
import settings
import pymongo
import pymongo.objectid
import bcrypt
import cjson
import tornadio
import tornadio.router
import tornadio.server
import numpy as np
import hashlib


conn = pymongo.Connection()
db = conn['task']
db.user.ensure_index([('username',1)], unique=True)
import logging
#import mail
import hashlib
import numpy as np
logging.basicConfig(level=logging.DEBUG)

def getid():
    return hashlib.sha1(str(pymongo.objectid.ObjectId())).hexdigest()

hostname = "localhost"
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
            'todostate' : d.get('todostate',''),
            'children' : d.get('children', []),
            'parent': d.get('parent', None),
            'documentid': d.get('documentid'),
            'status' : d.get('status', 'ACTIVE')}

def outline_app_to_mongo(d, user):
    assert 'documentid' in d
    return {'_id' : d['id'],
            'text' : d.get('text', ''),
            'username' : user,
            'todostate' : d.get('todostate',''),
            'children' : d.get('children', []),
            'parent': d.get('parent', None),
            'documentid': d.get('documentid'),
            'status' : d.get('status', 'ACTIVE')}

def save_outline(d):
    id_val = d.pop('_id')
    db.outline.update({'_id': id_val}, {'$set' : d}, upsert=True, safe=True)

def create_document(user, title):
    docid =  getid()
    rootid = docid + "-" + getid()
    
    docid = db.document.insert(
        {'_id' : docid,
         'root_id' : rootid,
         'username':user,
         'title': title,
         'todostates' : ["TODO", "INPROGRESS", "DONE", None],
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
    
def create_initial_data(user, passwd, email, title):
    salt = bcrypt.gensalt(log_rounds=7)
    passhash = bcrypt.hashpw(passwd, salt)
    db.user.insert({'username':user,
                    'salt' : salt,
                    'passhash':passhash,
                    'email':email}, safe=True)
    create_document(user, title)

                        
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

class AuthHandler(tornado.web.RequestHandler):
    @property
    def current_user(self):
        if hasattr(self, '_current_user'):
            return self._current_user
        else:
            return self.get_secure_cookie('username');
    @current_user.setter
    def current_user(self, new_user):
        self._current_user = new_user

class SmartDocRedirector(AuthHandler):
    """
    bypasses doclist if you only have one.
    """
    @tornado.web.authenticated
    def get(self):
        self.smart_redirect()
        
    @tornado.web.authenticated        
    def smart_redirect(self):
        document = db.document.find({'username':self.current_user, 'status':'ACTIVE'})
        document = list(document)
        if len(document) == 1:
            document = document[0]
            document = doc_mongo_to_app(document, self.current_user)
            self.redirect("/docview/rw/" + document['id'])
        else:
            self.redirect("/doclist")

class Register(SmartDocRedirector):
    def get(self):
        self.clear_all_cookies()
        self.render("templates/register.html", user=self.current_user);

    def post(self):
        username = self.get_argument('username')
        assert "," not in username
        assert username != 'all'
        password = self.get_argument('password')
        email = self.get_argument('email')
        create_initial_data(username, password, email, 'main')
        self.set_secure_cookie('username', username)
        self.current_user = username
        self.smart_redirect()
        

class Login(SmartDocRedirector):
    def get(self):
        self.render("templates/login.html", user=None);
        
    def post(self):
        username = self.get_argument('username')
        password = self.get_argument('password')
        user_dict = db.user.find_one({'username' : username})
        if bcrypt.hashpw(password, user_dict['salt']) == user_dict['passhash']:
            self.set_secure_cookie('username', username)
            self.current_user = username
            self.smart_redirect()
        else:
            self.redirect("/register")

class Logout(AuthHandler):
    def get(self):
        self.clear_all_cookies()
        self.redirect("/login")


class About(AuthHandler):
    def get(self):
        return self.render("templates/about.html", heading="About",
                           user=None)


    

class DocList(AuthHandler):
    @tornado.web.authenticated
    def get(self):
        documents = db.document.find({'username':self.current_user, 'status' : 'ACTIVE'})
        documents = [doc_mongo_to_app(x, self.current_user) for x in documents]
        self.render("templates/doclist.html", documents=documents,
                    user=self.current_user)

class Manage(AuthHandler):
    @tornado.web.authenticated
    def get(self, *args):
        #disregard docid
        root_url = "https://" + self.request.headers['Host'] + "/"
        documents = db.document.find({'username':self.current_user, 'status' : 'ACTIVE'})
        documents = [doc_mongo_to_app(x, self.current_user) for x in documents]
        self.render("templates/manage.html", documents=documents,
                    root_url=root_url, user=self.current_user)

    @tornado.web.authenticated
    def post(self, docid):
        delsetting = self.get_argument('delete', False)
        if delsetting:
            db.document.update({'_id' : docid},
                               {'$set' : {'status' : 'DELETE'}})
            return self.get(None)
        rwuser = self.get_argument('rwuser', '')
        ruser = self.get_argument('ruser', '')
        rwuser = [x.strip() for x in rwuser.split(',')]
        ruser = [x.strip() for x in ruser.split(',')]
        ruser = [x for x in ruser if x != '']
        rwuser = [x for x in rwuser if x != '']
        db.document.update({'_id' : docid},
                           {'$set': {'rwuser' : rwuser, 'ruser' : ruser}}, safe=True)
        return self.get(None)

class Create(AuthHandler):
    @tornado.web.authenticated
    def post(self):
        title = self.get_argument('title')
        create_document(self.current_user, title)
        self.redirect('/manage')

class AliasedUserHandler(AuthHandler):
    """
    uses self.docid and self.mode to determine an aliased user
    classes that inherit this, must be completely read only or
    completely read write, you cannot mix this in methods
    """
    mode = None
    @property
    def real_user(self):
        return self.get_secure_cookie('username')
    
    @property
    def current_user(self):
        if hasattr(self, 'docid') and hasattr(self, 'mode'):
            assert self.mode == 'rw' or self.mode == 'r'                
            document = db.document.find_one({'_id' : self.docid})
            document = doc_mongo_to_app(document, document['username'])
            if self.mode == 'r':
                valid_users = set()
                valid_users.update(document['ruser'])
                valid_users.update(document['rwuser'])
                valid_users.add(document['username'])
                if 'all' in valid_users or \
                       self.real_user in valid_users:
                    return document['username']
            elif self.mode =='rw':
                valid_users = set()
                valid_users.update(document['rwuser'])
                valid_users.add(document['username'])
                if 'all' in valid_users or \
                       self.real_user in valid_users:
                    return document['username']
        return None;
    
    def get(self, docid):
        self.docid = docid
        return self.get_fake_auth_view()

    def post(self, docid):
        self.docid = docid
        return self.post_fake_auth_view()
    
class DocView(AliasedUserHandler):
    mode = 'rw'
    top_id = 0
    @tornado.web.authenticated
    def get_fake_auth_view(self):
        DocView.top_id += 1
        document = db.document.find_one({'username':self.current_user,
                                         '_id' : self.docid})
        self.render("templates/outline.html", root_id=document['root_id'],
                    document_id=document['_id'], mode=self.mode,
                    user=self.real_user, title=document['title'],
                    owner=self.current_user, client_id=DocView.top_id)
        
class ReadOnlyDocView(DocView):
    """
    this class acts as a read only client, there is no security here,
    anyone who can access this client can try to access the regular
    DocView.  security lies inside the list of ruser and rwuser
    themselves in the actual document
    """
    mode='r'

class Document(AliasedUserHandler):
    mode = 'r'
    @tornado.web.authenticated
    def get_fake_auth_view(self):
        document = db.document.find_one({'_id':self.docid})
        document = doc_mongo_to_app(document, self.current_user)
        outline = db.outline.find({'documentid': self.docid,
                                   'username':self.current_user,
                                   'status' : {'$ne' : 'DELETE'}})

        outline = list(outline)
        outline = [outline_mongo_to_app(e, self.current_user) \
                   for e in outline]
        self.write(cjson.encode({'document':document,
                                 'outline': outline}))
                       

#handler if we are indexing elems by ID
class BulkSave(AliasedUserHandler):
    mode = 'rw'
    @tornado.web.authenticated
    def post_fake_auth_view(self):
        docid = self.docid
        data = self.get_argument('data')
        data = cjson.decode(data)
        to_broadcast = []
        if 'clientid' in data:
            clientid = data.pop('clientid')
        else:
            clientid = None
            
        for dtype, objects in data.iteritems():
            for k, d in objects.iteritems():
                if dtype == 'outline':
                    to_broadcast.append(d)
                    d = outline_app_to_mongo(d, self.current_user)
                    save_outline(d)
                # elif dtype == 'document':
                #     d = doc_app_to_mongo(d, self.current_user)
                #     save_doc(d)
        try:
            PubHandler.broadcast(self.docid, 
                                 cjson.encode({'type' : 'outlines',
                                               'outline' : to_broadcast}),
                                 clientid=clientid)
        except Exception as e:
            logging.exception(e)
            
        self.write("success");

class Import(AliasedUserHandler):
    mode = 'rw'
    def get_fake_auth_view(self):
        return self.render("templates/import.html", docid=self.docid,
                           user=self.real_user)
        
    def post_fake_auth_view(self):
        outlines = update_db_from_txt(self.get_argument('data'),
            self.current_user, self.docid)
        PubHandler.broadcast(self.docid, 
                             cjson.encode({'type' : 'outlines',
                                           'outline' : outlines}))


        self.redirect("/docview/rw/" + self.docid)

def check_mail():
    import mailbox
    box = mailbox.mbox("/var/mail/yata")
    logging.debug("checking mail")
    try:
        box.lock()
        while(1):
            _, msg = box.popitem()
            if msg.is_multipart():
                body = msg.get_payload()[0].get_payload()
            else:
                body = msg.get_payload()
            logging.debug(str((msg['To'], msg['Subject'], body)))
            user = msg['To'].split('@')[0]
            title = msg['Subject']
            doc = db.document.find_one({'username':user,
                                        'title' : title})

            if doc is None:
                continue
            else:
                outlines = update_db_from_txt(body,
                                              user,
                                              doc['_id'],)
                logging.debug(outlines)
                PubHandler.broadcast(doc['_id'],
                                     cjson.encode({'type' : 'outlines',
                                                   'outline' : outlines}))
    except KeyError as e:
        pass
    
    finally:
        box.unlock()
        box.close()



def update_db_from_txt(txt, user, docid, prefix="*"):
    document = db.document.find_one({'_id' : docid, 'username' : user})
    document = doc_mongo_to_app(document, document['username'])
    nodes = outlines_from_text(txt, user, docid, prefix=prefix)
    add_to_root = []
    for n in nodes:
        if n['parent'] is None:
            n['parent'] = document['root_id']
            add_to_root.append(n['id'])
    print add_to_root
    for n in nodes:
        n = outline_app_to_mongo(n, user)
        data = "parent: %s id: %s txt: %s children: %s" % (str(n['parent']), str(n['_id']), str(n['text']), str(n['children']))
        print data
        save_outline(n)
    db.outline.update({'_id' : document['root_id'], 'username' : user},
                      {'$pushAll' : {'children' : add_to_root}},
                      safe=True)
    root = db.outline.find_one({'_id' : document['root_id'],
                                'username' : user})
    root = outline_mongo_to_app(root, user)
    nodes.insert(0, root)
    return nodes
    
def outlines_from_text(txt, user, docid, prefix="*"):
    def bare_outline(txt, user, docid):
        return {'id' : getid(),
                'text' : txt, 
                'username' : user,
                'todostate' : '',
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
    
class Export(AliasedUserHandler):
    mode='r'
    def get_fake_auth_view(self):
        doc = db.document.find_one({'_id' : self.docid,
                                    'username' : self.current_user})
        doc = doc_mongo_to_app(doc, self.current_user)
        self.write(doc_to_text(doc, self.current_user))
        self.set_header('Content-Type','text/plain')
        

def doc_to_text(document, user, prefix="*"):
    outlines = db.outline.find({'documentid': document['id'],
                                'username': user,
                                'status' : {'$ne' : 'DELETE'}})
    outline_dict = {}
    for o in outlines:
        o = outline_mongo_to_app(o, user)
        outline_dict[o['id']] = o
    root = outline_dict[document['root_id']]
    output = node_to_text(outline_dict, root, user, prefix=prefix)
    logging.debug(output)
    return output

def node_to_text(outlines, outline, user, prefix="*", level=0):
    output = "".join(["*" for x in range(level)])
    output += "" if not outline['todostate'] else outline['todostate']
    output += ' '
    output += outline['text']

    children_txt = [node_to_text(outlines, outlines[x], user,
                                 prefix=prefix, level=level+1)
                    for x in outline['children']]
    total_txt = [output]
    total_txt.extend(children_txt)
    return "\r\n".join(total_txt)

class PubHandler(tornadio.SocketConnection, AliasedUserHandler):
    mode = 'r'
    clients = {}
    top_id = 0
    
    def on_open(self, *args, **kwargs):
        logging.debug('connected')
        self.request = args[0]
        
    def on_message(self, message):
        message = cjson.decode(message)
        if message['type'] == 'registration':
            PubHandler.top_id += 1
            self.clientid = PubHandler.top_id
            self.docid = message['docid']
            if self.current_user:
                self.clients.setdefault(self.docid, set()).add(self)
                self.send(cjson.encode(
                    {'type' : 'registration_confirmation',
                     'clientid' : self.clientid}))
        
            
    def on_close(self, *args, **kwargs):
        if hasattr(self, 'docid'):
            if hasattr(self, 'clientid'):
                logging.debug("%s, %s", self.clientid, self.clients)
                self.clients[self.docid].remove(self)

    @classmethod
    def broadcast(cls, docid, msg, clientid=None):
        if docid in cls.clients:
            for client in cls.clients[docid]:
                if client.clientid != clientid:
                    print 'sending', msg, client.clientid
                    client.send(msg)
        
route = tornadio.get_router(PubHandler);
application = tornado.web.Application([(r"/register", Register),
                                       (r"/login", Login),
                                       (r"/about", About),
                                       (r"/logout", Logout),
                                       
                                       (r"/", SmartDocRedirector),

                                       (r"/doclist", DocList),
                                       (r"/manage/(.*)", Manage),
                                       (r"/manage", Manage),
                                       (r"/create", Create),
                                       (r"/docview/rw/(.*)", DocView),
                                       (r"/docview/r/(.*)", ReadOnlyDocView),
                                       (r"/document/(.*)", Document),
                                       (r"/bulk/(.*)", BulkSave),
                                       (r"/import/(.*)", Import),
                                       (r"/export/(.*)", Export),
                                       route.route()
                                       ],
                                      **settings.settings
                                      )
PubHandler.application = application
if __name__ == "__main__":
    mail_listener = tornado.ioloop.PeriodicCallback(check_mail,
                                                    10000)
    mail_listener.start()
    server = tornadio.server.SocketServer(
        application,
        ssl_options={'certfile' : "/etc/nginx/server.crt",
                     'keyfile' : "/etc/nginx/server.key"}
        )
