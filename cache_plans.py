from webflask import app, prepare_app, stripe_plan, _stripe_plan
prepare_app(app)
db = app.db
for user in db.user.find():
    real_plan = _stripe_plan(user)
    db.user.update({'_id' : user['_id']},
                   {'$set' : {'cached_plan' : real_plan}},
                   safe=True)
