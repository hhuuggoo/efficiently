#collections  to migrate, entries->outline
#outlines-> document
#migrate to incorporate
#todostate right into the text body for the data model

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

db.document.update({}, {'$set' : {'todostates': ['TODO','INPROGRESS', 'DONE']}}, False, True)
for outline in db.outline.find():
    try:
        txt = outline['text']
    except:
        continue
    todostate = outline['todostate']
    if todostate:
        txt = todostate + " " + txt
    db.outline.update({'_id' : outline['_id']},
                      {'$set' : {'text' : txt},
                       '$unset' : {'todostate' : 1}});
