from app import app
from flask import session, request
import uuid
import logging
import json
import time

from flask import (
    request, current_app,
    )
log = logging.getLogger(__name__)

from werkzeug.contrib.securecookie import SecureCookie

def can_read(document, username):
    valid_users = set()
    valid_users.update(document.get('rwuser', []))
    valid_users.update(document.get('ruser', []))
    valid_users.add(document['username'])
    return 'all' in valid_users or session.get('username') in valid_users

def can_write(document, username):
    valid_users = set()
    valid_users.update(document.get('rwuser',[]))
    valid_users.add(document['username'])
    return 'all' in valid_users or session.get('username') in valid_users

class SecureCookie(SecureCookie):
    serialization_method = json

def secure_encode(adict, secretkey):
    return SecureCookie(data=adict, secret_key=secretkey, new=True).serialize()

def secure_decode(astring, secretkey):
    return SecureCookie.unserialize(astring, secretkey)

def auth_token(username, secretkey):
    return secure_encode({'username' : username, 'time' : time.time()},
                         secretkey)

def docrw_auth(auth, docid):
    document = app.db.document.find_one({'_id' : docid})
    authdict = secure_decode(auth, app.secret_key)
    username = authdict['username']
    return can_write(document, username)

    
def docr_auth(auth, docid):
    document = app.db.document.find_one({'_id' : docid})
    authdict = secure_decode(auth, app.secret_key)
    username = authdict['username']
    return can_read(document, username)

    
