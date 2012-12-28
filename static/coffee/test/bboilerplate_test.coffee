class TestObject extends BBoilerplate.HasProperties
  collection_ref : ['testobjects']
  type : 'TestObject'

class TestObjects extends Backbone.Collection
  model : TestObject
  url : "/"

test('computed_properties', ->
  window.testobjects = new TestObjects()
  model = window.testobjects.create({'a' : 1, 'b': 1})
  model.register_property('c', () -> @get('a') + @get('b'))
  model.add_dependencies('c', model, ['a', 'b'])
  temp =  model.get('c')
  ok(temp == 2)
)

test('cached_properties_react_changes', ->
  window.testobjects = new TestObjects()
  model = window.testobjects.create({'a' : 1, 'b': 1})
  model.register_property('c',
    () -> @get('a') + @get('b'),
    true
  )
  model.add_dependencies('c', model, ['a', 'b'])
  temp =  model.get('c')
  ok(temp == 2)
  temp = model.get_cache('c')
  ok(not _.isUndefined(temp))
  model.set('a', 10)
  temp = model.get_cache('c')
  temp = model.get('c')
  ok(temp == 11)
)


test('has_prop_manages_event_lifcycle', ->
  window.testobjects = new TestObjects()
  model = window.testobjects.create({'a' : 1, 'b': 1})
  model2 = window.testobjects.create({'a' : 1, 'b': 1})
  triggered = false
  BBoilerplate.safebind(model, model2, 'change', () -> triggered = true)
  model2.set({'a' : 2})
  ok(triggered)
  triggered = false
  model.destroy()
  model2.set({'a' : 3})
  ok(not triggered)
)

test('has_prop_manages_event_for_views', ->
  window.testobjects = new TestObjects()
  model = window.testobjects.create({'a' : 1, 'b': 1})
  model2 = window.testobjects.create({'a' : 1, 'b': 1})
  view = new BBoilerplate.BasicView({'model' : model2})

  triggered = false
  BBoilerplate.safebind(view, model, 'change', () -> triggered = true)
  model.set({'a' : 2})
  ok(triggered)
  triggered = false
  view.remove()
  model.set({'a' : 3})
  ok(not triggered)
)

test('property_setters', ->
  window.testobjects = new TestObjects()
  model = window.testobjects.create({'a' : 1, 'b': 1})
  prop =  () -> @get('a') + @get('b')
  setter = (val) ->
    @set('a', val/2, {silent:true})
    @set('b', val/2)
  model.register_property('c', prop, true)
  model.add_dependencies('c', model, ['a', 'b'])
  model.register_setter('c', setter)
  model.set('c', 100)
  ok(model.get('a') == 50)
  ok(model.get('b') == 50)
)