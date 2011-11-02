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
                    'email':email})
    objid = db.entries.insert({'username':user,
                               'outline':'Main'})
    db.entries.update({'_id' : objid},
                      {'$set' : {'_id':str(objid)}})
    
    db.outlines.insert({'username':user,
                        'outlinetitle': 'Main',
                        'root': objid})
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
                        
            
class Entries(AuthHandler):
    def get(self, title):
        if not self.current_user:
            return self.redirect("/register");
        else:
            entries = db.entries.find({'outlinetitle': title,
                                       'username':self.current_user})
            entries = list(entries)
            for e in entries:
                e['id'] = str(e.pop('_id'))
            self.write(cjson.encode(entries))
    def post(self, title):
        if not self.current_user:
            return self.redirect("/register");
        else:
            data = self.get_argument('data')
            data = cjson.decode(data)
            for d in data:
                db.entries.update({'_id' : data['id']},
                                  {'_id' : data['id'],
                                   'text' : data['text'],
                                   'username' : self.current_user,
                                   'todostate' : data['todostate'],
                                   'children' : data['children'],
                                   'parent': data['parent'],
                                   'outlinetitle':data['outlinetitle']},
                                  upsert=True)
            self.write("success");
                
class Entry(AuthHandler):
    def post(self, objid):
        if not self.current_user:
            return self.redirect("/register");
        data = self.get_argument('data')
        data = cjson.decode(data)
        print data
        db.entries.update({'_id' : data['id']},
                          {'_id' : data['id'],
                           'text' : data['text'],
                           'username' : self.current_user,
                           'todostate' : data['todostate'],
                           'children' : data['children'],
                           'parent': data['parent'],
                           'outlinetitle':data['outlinetitle']},
                          upsert=True)
        
class About(AuthHandler):
    def get(self):
        return self.render("templates/about.html", heading="About")

application = tornado.web.Application([(r"/", Outline),
                                       (r"/register", Register),
                                       (r"/login", Login),
                                       (r"/entries/(.*)", Entries),
                                       (r"/entry/(.*)", Entry),
                                       (r"/about", About),
                                       ],
                                      **settings.settings
                                      )


create_email = True
if __name__ == "__main__":
    application.listen(8888)
    tornado.ioloop.IOLoop.instance().start()
    import sys
    if sys.argv[1] == 'noemail':
        create_email = False

