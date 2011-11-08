import sys
user = sys.argv[1]
outline = sys.argv[2]

import web
entries = web.db.entries.find({'username' : user, 'outlinetitle': outline,
                                 'status' : {'$nin' : ['DELETE']}})
outline = web.db.outlines.find_one({'username':user, 'outlinetitle':outline})
entries = [web.entry_mongo_to_app(x, user) for x in entries]
root_id = str(outline['root'])
web.separate_orphans(root_id, entries, user)

