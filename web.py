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
    
    db.outlines.insert({'username':user,
                        'title': 'Main',
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
                                             'title':'Main'})
            self.render("templates/outline.html", root_id=outlines['root'])
                        
            
class Entries(AuthHandler):
    def get(self, title):
        if not self.current_user:
            return self.redirect("/register");
        else:
            entries = db.entries.find({'title': title,
                                       'username':self.current_user})
            entries = list(entries)
            for e in entries:
                e['id'] = str(e.pop('_id'))
            self.write(cjson.encode(entries))

class About(AuthHandler):
    def get(self):
        return self.render("templates/about.html", heading="About")

application = tornado.web.Application([(r"/", Outline),
                                       (r"/register", Register),
                                       (r"/login", Login),
                                       (r"/entries/(.*)", Entries),
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

