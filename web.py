import tornado
import tornado.ioloop
import tornado.web
import settings
import pymongo
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

def create_initial_data(user, passwd, email):
    salt = bcrypt.gensalt(log_rounds=7)
    passhash = bcrypt.hashpw(passwd, salt)
    db.user.insert({'username':user,
                    'salt' : salt,
                    'passhash':passhash,
                    'email':email}, safe=True)
    objid = db.entries.insert({'username':user,
                               'outlinetitle':'Main'}, safe=True)
    db.entries.update({'_id' : objid},
                      {'$set' : {'_id':str(objid)}}, safe=True)
    
    db.outlines.insert({'username':user,
                        'outlinetitle': 'Main',
                        'root': objid}, safe=True)
class AuthHandler(tornado.web.RequestHandler):
    @property
    def current_user(self):
        return self.get_secure_cookie('username');
    
class Login(AuthHandler):
    def get(self):
        self.render("templates/login.html");
    def post(self):
        username = self.get_argument('username')
        password = self.get_argument('password')
        user_dict = db.user.find_one({'username' : username})
        if bcrypt.hashpw(password, user_dict['salt']) == user_dict['passhash']:
            self.set_secure_cookie('username', username)
            self.redirect("/");
        else:
            self.redirect("/register")
        
class Register(AuthHandler):
    def get(self):
        self.render("templates/register.html");

    def post(self):
        username = self.get_argument('username')
        password = self.get_argument('password')
        email = self.get_argument('email')
        create_initial_data(username, password, email)
        self.set_secure_cookie('username', username)
        self.redirect("/")

class Outline(AuthHandler):
    def get(self):
        if not self.current_user:
            return self.redirect("/login");
        else:
            outlines = db.outlines.find_one({'username':self.current_user,
                                             'outlinetitle':'Main'})
            self.render("templates/outline.html", root_id=outlines['root'])
                        
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
        save_entry(entry_app_to_mongo(node, user))
    for node in good_nodes:
        node['status'] = 'ACTIVE'
        save_entry(entry_app_to_mongo(node, user))
    return good_nodes, dictnodes.values()

class Entries(AuthHandler):
    def get(self, title):
        if not self.current_user:
            return self.redirect("/register");
        else:
            entries = db.entries.find({'outlinetitle': title,
                                       'username':self.current_user,
                                       'status' : {'$ne' : 'DELETE'}})
            entries = list(entries)
            entries = [entry_mongo_to_app(e, self.current_user)
                           for e in entries]
            self.write(cjson.encode(entries))

def entry_mongo_to_app(d, user):
    return {'id' : str(d['_id']),
            'text' : d.get('text', ''),
            'username' : user,
            'todostate' : d.get('todostate',''),
            'children' : d.get('children', []),
            'parent': d.get('parent', None),
            'outlinetitle': d.get('outlinetitle', ''),
            'status' : d.get('status', 'ACTIVE')}

def entry_app_to_mongo(d, user):
    return {'_id' : d['id'],
            'text' : d.get('text', ''),
            'username' : user,
            'todostate' : d.get('todostate',''),
            'children' : d.get('children', []),
            'parent': d.get('parent', None),
            'outlinetitle': d.get('outlinetitle', ''),
            'status' : d.get('status', 'ACTIVE')}

def save_entry(d):
    db.entries.update({'_id':d['_id']}, d, upsert=True, safe=True)

#handler if we are indexing elems by ID
class BulkSave(AuthHandler):
    def post(self):
        if not self.current_user:
            return self.redirect("/register");
        else:
            data = self.get_argument('data')
            data = cjson.decode(data)
            for d in data:
                d = entry_app_to_mongo(d, self.current_user)
                save_entry(d)
            self.write("success");

class Logout(AuthHandler):
    def get(self):
        self.clear_all_cookies()
        self.redirect("/login")
        
class About(AuthHandler):
    def get(self):
        return self.render("templates/about.html", heading="About")

application = tornado.web.Application([(r"/", Outline),
                                       (r"/register", Register),
                                       (r"/login", Login),
                                       (r"/entries/(.*)", Entries),
                                       (r"/bulk", BulkSave),
                                       (r"/about", About),
                                       (r"/logout", Logout),
                                       ],
                                      **settings.settings
                                      )

if __name__ == "__main__":
    application.listen(9000)
    tornado.ioloop.IOLoop.instance().start()
