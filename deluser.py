import web
import sys
user = sys.argv[1]

web.db.entries.remove({'username':user})
web.db.user.remove({'username':user})
web.db.outlines.remove({'username':user})
