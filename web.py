import tornado
import tornado.ioloop
import tornado.web
import settings
import pymongo
import pymongo.objectid
import bcrypt
import cjson

conn = pymongo.Connection()
db = conn['task']
db.user.ensure_index([('username',1)], unique=True)
import logging
#import mail
import hashlib
import numpy as np
logging.basicConfig(level=logging.DEBUG)

hostname = "localhost"

def create_document(user, title):
    docid =  str(pymongo.objectid.ObjectId())
    rootid = docid + "-" + str(pymongo.objectid.ObjectId())
    
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

class AuthHandler(tornado.web.RequestHandler):
    @property
    def current_user(self):
        return self.get_secure_cookie('username');
    
class SmartDocRedirector(AuthHandler):
    """
    bypasses doclist if you only have one.
    """
    @tornado.web.authenticated
    def get(self):
        self.smart_redirect()
        
    def smart_redirect(self):
        document = db.document.find({'username':self.current_user})
        document = list(document)
        if len(document) == 1:
            document = document[0]
            document = doc_mongo_to_app(document, self.current_user)
            self.redirect("/docview/" + document['id'])
        else:
            self.redirect("/doclist/")

class Login(SmartDocRedirector):
    def get(self):
        self.render("templates/login.html");
    def post(self):
        username = self.get_argument('username')
        password = self.get_argument('password')
        user_dict = db.user.find_one({'username' : username})
        if bcrypt.hashpw(password, user_dict['salt']) == user_dict['passhash']:
            self.set_secure_cookie('username', username)
            self.smart_redirect()
        else:
            self.redirect("/register")

class DocList(AuthHandler):
    @tornado.web.authenticated
    def get(self):
        documents = db.document.find({'username':self.current_user})
        documents = [doc_mongo_to_app(x, self.current_user) for x in documents]
        self.render("templates/doclist.html", documents=documents)

class Register(SmartDocRedirector):
    def get(self):
        self.render("templates/register.html");

    def post(self):
        username = self.get_argument('username')
        password = self.get_argument('password')
        email = self.get_argument('email')
        create_initial_data(username, password, email, 'main')
        self.set_secure_cookie('username', username)
        self.smart_redirect()
class DocView(AuthHandler):
    @tornado.web.authenticated
    def get(self, docid):
        document = db.document.find_one({'username':self.current_user,
                                         '_id' : docid})
        self.render("templates/outline.html", root_id=document['root_id'],
                    document_id=document['_id'])
                        
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

class Document(AuthHandler):
    @tornado.web.authenticated
    def get(self, docid):
        document = db.document.find_one({'_id':docid})
        document = doc_mongo_to_app(document, self.current_user)
        outline = db.outline.find({'documentid': docid,
                                   'username':self.current_user,
                                   'status' : {'$ne' : 'DELETE'}})

        outline = list(outline)
        outline = [outline_mongo_to_app(e, self.current_user) \
                   for e in outline]
        self.write(cjson.encode({'document':document,
                                 'outline': outline}))
                       
def doc_mongo_to_app(d, user):
    assert 'root_id' in d
    assert '_id' in d
    return {'id' : str(d['_id']),
            'root_id':d.get('root_id'),
            'title' : d.get('title', ''),
            'username' : user,
            'todostates' : d.get('todostates',[]),
            'todocolors' : d.get('todocolors', {}),
            'status': d.get('status', 'ACTIVE')
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
            'status': d.get('status', 'ACTIVE')
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

#handler if we are indexing elems by ID
class BulkSave(AuthHandler):
    @tornado.web.authenticated
    def post(self):
        data = self.get_argument('data')
        data = cjson.decode(data)
        for dtype, objects in data.iteritems():
            for k, d in objects.iteritems():
                if dtype == 'outline':
                    d = outline_app_to_mongo(d, self.current_user)
                    save_outline(d)
                elif dtype == 'document':
                    d = doc_app_to_mongo(d, self.current_user)
                    save_doc(d)
        self.write("success");

class Logout(AuthHandler):
    def get(self):
        self.clear_all_cookies()
        self.redirect("/login")
        
class About(AuthHandler):
    def get(self):
        return self.render("templates/about.html", heading="About")

application = tornado.web.Application([(r"/", SmartDocRedirector),
                                       (r"/docview/(.*)", DocView),
                                       (r"/register", Register),
                                       (r"/login", Login),
                                       (r"/document/(.*)", Document),
                                       (r"/bulk", BulkSave),
                                       (r"/about", About),
                                       (r"/logout", Logout),
                                       (r"/doclist", DocList),
                                       ],
                                      **settings.settings
                                      )

if __name__ == "__main__":
    application.listen(9000)
    tornado.ioloop.IOLoop.instance().start()
