#collections  to migrate, entries->outline
#outlines-> document
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

olddocs = db.outlines.find()
user_docids = {}
for doc in olddocs:
    rootid = str(doc['root'])
    docid = str(doc['_id'])
    user_docids[doc['username']] = docid
    docid = db.document.insert(
        {'_id' : docid,
         'root_id' : rootid,
         'username': doc['username'],
         'title': 'Main',
         'todostates' : ["TODO", "INPROGRESS", "DONE", None],
         'todocolors': {'TODO' : 'red',
                        'INPROGRESS': 'red',
                        'DONE' : 'green'},
         'status': 'ACTIVE'
         },
        safe=True)
    
for user in db.user.find():
    if user['username'] not in user_docids:
        docid =  str(pymongo.objectid.ObjectId())
        rootid = docid + "-" + str(pymongo.objectid.ObjectId())
        user = user['username']
        docid = db.document.insert(
            {'_id' : docid,
             'root_id' : rootid,
             'username':user,
             'title': 'Main',
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
        user_docids[user] = docid
    
oldoutlines = db.entries.find()
for outline in oldoutlines:
    if not isinstance(outline['_id'], basestring):
        continue
    user = outline['username']
    docid = user_docids[user]
    outline['documentid'] = docid
    d = outline
    db.outline.insert(
        {'_id' : d['_id'],
         'text' : d.get('text', ''),
         'username' : user,
         'todostate' : d.get('todostate',''),
         'children' : d.get('children', []),
         'parent': d.get('parent', None),
         'documentid': d.get('documentid'),
         'status' : d.get('status', 'ACTIVE')}
        )
    

