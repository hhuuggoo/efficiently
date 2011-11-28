import os

settings = {
    "static_path": os.path.join(os.path.dirname(__file__), "static"),
    "cookie_secret": "sdfasdfasdf;klj;lkj;sdfsll=sd",
    "xsrf_cookies": False,
    'debug' : True,
    'login_url' : '/login',
    'ssl_options' : {'certfile' : "/etc/nginx/server.crt",
                     'keyfile' : "/etc/nginx/server.key"}
    
    }


