if this.BBoilerplate
  BBoilerplate = this.BBoilerplate
else
  BBoilerplate = {}
  this.BBoilerplate = BBoilerplate

uniqueId = (prefix) ->
    #from ipython project
    #http://www.ietf.org/rfc/rfc4122.txt
    s = []
    hexDigits = "0123456789ABCDEF";
    for i in _.range(32)
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    s[12] = "4"
    s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1)
    uuid = s.join("");
    return prefix + "-" + uuid;

BBoilerplate.uniqueId = uniqueId
safebind = (binder, target, event, callback) ->
  # ##function : safebind
  # safebind, binder binds to an event on target, which triggers callback.
  # Safe means that when the binder is destroyed, all callbacks are unbound.
  # callbacks are bound and evaluated in the context of binder

  # ####Parameters

  # * binder : some backbone model - when this is destroyed, the callback will be
  #   unbound
  # * target : object triggering the event we want to bind to
  # * event : string, name of the event
  # * callback : callback for the event

  # ####Returns

  # * null

  # stores objects we are binding events on, so that if we go away,
  # we can unbind all our events
  # currently, we require that the context being used is the binders context
  # this is because we currently unbind on a per context basis.  this can
  # be changed later if we need it
  if not _.has(binder, 'eventers')
    binder['eventers'] = {}
  binder['eventers'][target.id] = target
  target.on(event, callback, binder)
  # also need to bind destroy to remove obj from eventers.
  # no special logic needed to manage this life cycle, because
  # we will already unbind all listeners on target when binder goes away
  target.on('destroy remove',
      () =>
        delete binder['eventers'][target]
    ,
      binder)
  return null
BBoilerplate.safebind = safebind

resolve_ref = (collection_ref, id) ->
  collection = BBoilerplate.get_collection(collection_ref)
  try
    model = collection.get(id)
  catch error
    console.log(collection_ref, id)
  return  model

BBoilerplate.get_collection = (names) ->
  # ## function : get_collection

  # finds a group of collections, at the location specified by names

  # ####Parameters

  # * names : list of strings - we start at the global name spaces and descend
  #   through each string.  the last value should refer to the group of
  #   collections you want

  # ####Returns

  # * collections
  last = window
  for n in names
    last = last[n]
  return last

class BBoilerplate.HasProperties extends Backbone.Model
# ###class : HasProperties
#   Our property system
#   we support python style computed properties, with getters as well as setters.
#   we also support caching of these properties, and notifications of property
#   changes
#
#   @register_property(name, dependencies, use_cache)

  # array of strings which tell you how to go from the global namespace
  # to the collection  that stores this model. we need this becuase this gets
  # passed and stored in json as part of the reference system

  collection_ref : null

  get_collection_ref : () ->
    collection_ref = this.get('collection_ref')
    if collection_ref
      return collection_ref
    else
      return this.collection_ref

  destroy : (options)->
    #calls super, also unbinds any events bound by safebind
    super(options)
    if _.has(this, 'eventers')
      for own target, val of @eventers
        val.off(null, null, this)

  isNew : () ->
    return not this.get('created')

  initialize : (attrs, options) ->
    # auto generates ids if we need to, calls deferred initialize if we have
    # not done so already.   sets up datastructures for computed properties
    if not attrs
       attrs = {}
    if not options
      options = {}
    super(attrs, options)
    @properties = {}
    @property_cache = {}
    if not _.has(attrs, 'id')
      this.id = uniqueId(this.type)
      this.attributes['id'] = this.id
    _.defer(() =>
      if not @inited
        @dinitialize(attrs, options))

  dinitialize : (attrs, options) ->
    # deferred initialization - this is important so we can separate object
    # creation from object initialization.  We need this if we receive a group
    # of objects, that need to bind events to each other.  Then we create them all
    # first, and then call deferred intialization so they can setup dependencies
    # on each other
    @inited = true

  set : (key, value, options) ->
    # checks for setters, if setters are present, call setters first
    # then remove the computed property from the dict of attrs, and call super

    # backbones set function supports 2 call signatures, either a dictionary of
    # key value pairs, and then options, or one key, one value, and then options.
    # replicating that logic here
    if _.isObject(key) or key == null
      attrs = key
      options = value
    else
      attrs = {}
      attrs[key] = value
    toremove  = []
    for own key, val of attrs
      if _.has(this, 'properties') and
         _.has(@properties, key) and
         @properties[key]['setter']
        @properties[key]['setter'].call(this, val)
        toremove.push(key)
    for key in toremove
      delete attrs[key]
    if not _.isEmpty(attrs)
      super(attrs, options)

  structure_dependencies : (dependencies) ->
    # ### method : HasProperties::structure_dependencies
    # ####Parameters
    # * dependencies : our structure for specing out
    #   dependencies of properties look like this
    #   `[{'ref' : {'type' : type, 'id' : id}, 'fields : ['a', 'b', 'c']}]`
    #   for convenience, we allow people to refer to this objects attributes
    #   as strings, only using the formal structure for other objets attributes.
    #   this function converts everything into that formal structure.
    #   SO this :

    #       ['myprop1, 'myprop2',
    #       {'ref' : {'type' : 'otherobj', 'id' : 'otherobj'},
    #        'fields' : 'otherfield'}]

    #   is equivalent to :

    #       [{'ref' : {'type' : 'mytype', 'id' : 'myid'},
    #       'fields' : ['myprop1, 'myprop2'],
    #       {'ref' : {'type' : 'otherobj', 'id' : 'otherobj'}
    #       'fields' : 'otherfield'}]
    # ####Returns
    # * deps : the verbose form of dependencies where references are explicitly
    # identified
    other_deps = (x for x in dependencies when _.isObject(x))
    local_deps = (x for x in dependencies when not _.isObject(x))
    if local_deps.length > 0
      deps = [{'ref' : this.ref(), 'fields' : local_deps}]
      deps = deps.concat(other_deps)
    else
      deps = other_deps
    return deps

  add_dependencies:  (prop_name, dependencies) ->
    prop_spec = @properties[prop_name]
    prop_spec.dependencies = prop_spec.dependencies.concat(dependencies)
    dependencies = @structure_dependencies(dependencies)
      # bind depdencies to change dep callback
    for dep in dependencies
      obj = @resolve_ref(dep['ref'])
      for fld in dep['fields']
        safebind(this, obj, "change:" + fld, prop_spec['callbacks']['changedep'])

  register_property : \
    (prop_name, getter, setter, use_cache) ->
      # ###method : HasProperties::register_property
      # register a computed property
      # ####Parameters

      # * prop_name : name of property
      # * dependencies : something like this
      #   ['myprop1, 'myprop2',
      #     {'ref' : {'type' : 'otherobj', 'id' : 'otherobj'}
      #     'fields' : 'otherfield'}]
      # * getter : function, calculates computed value, takes no arguments
      # * use_cache : whether to cache or not
      # * setter : function, takes new value as parametercalled on set.
      # can be null
      # #### Returns
      # * prop_spec : specification of the property, with the getter,
      # setter, dependenices, and callbacks associated with the prop
      if _.isUndefined(use_cache)
        use_cache = true
      if _.has(@properties, prop_name)
        @remove_property(prop_name)
      # we store a prop_spec, which has the getter, setter, dependencies
      # we also store the callbacks used to implement the computed property,
      # we do this so we can remove them later if the property is removed
      changedep = () =>
        @trigger('changedep:' + prop_name)
      propchange = () =>
        firechange = true
        if prop_spec['use_cache']
          old_val = @get_cache(prop_name)
          @clear_cache(prop_name)
          new_val = @get(prop_name)
          firechange = new_val != old_val
        if firechange
          @trigger('change:' + prop_name, this, @get(prop_name))
          @trigger('change', this)
      prop_spec=
        'getter' : getter,
        'dependencies' : [],
        'use_cache' : use_cache
        'setter' : setter
        'callbacks':
          changedep : changedep
          propchange : propchange
      @properties[prop_name] = prop_spec
      # bind propchange callback to change dep event
      safebind(this, this, "changedep:" + prop_name,
        prop_spec['callbacks']['propchange'])
      return prop_spec

  remove_property : (prop_name) ->
    #removes the property, unbinding all associated callbacks that implemented it
    prop_spec = @properties[prop_name]
    dependencies = prop_spec.dependencies
    for dep in dependencies
      obj = @resolve_ref(dep['ref'])
      for fld in dep['fields']
        obj.off('change:' + fld, prop_spec['callbacks']['changedep'], this)
    @off("changedep:" + dep)
    delete @properties[prop_name]
    if prop_spec.use_cache
      @clear_cache(prop_name)

  has_cache : (prop_name) ->
    return _.has(@property_cache, prop_name)

  add_cache : (prop_name, val) ->
    @property_cache[prop_name] = val

  clear_cache : (prop_name, val) ->
    delete @property_cache[prop_name]

  get_cache : (prop_name) ->
    return @property_cache[prop_name]

  get : (prop_name) ->
    # ### method : HasProperties::get
    # overrides backbone get.  checks properties, calls getter, or goes to cache
    # if necessary.  If it's not a property, then just call super

    if _.has(@properties, prop_name)
      prop_spec = @properties[prop_name]
      if prop_spec.use_cache and @has_cache(prop_name)
        return @property_cache[prop_name]
      else
        getter = prop_spec.getter
        computed = getter.apply(this, this)
        if @properties[prop_name].use_cache
          @add_cache(prop_name, computed)
        return computed
    else
      return super(prop_name)

  ref : ->
    # ### method : HasProperties::ref
    #generates a reference to this model
    ref =
      id : @id
      collection : @get_collection_ref()
    return ref

  resolve_ref : (ref) ->
    # ### method : HasProperties::resolve_ref
    #converts a reference into an object
    if not ref
      console.log('ERROR, null reference')
    #this way we can reference ourselves
    # even though we are not in any collection yet
    if ref.collection == @get_collection_ref() and ref.id == @id
      return this
    else
      return resolve_ref(ref.collection, ref['id'])

  get_ref : (ref_name) ->
    # ### method : HasProperties::get_ref
    #convenience function, gets the backbone attribute ref_name, which is assumed
    #to be a reference, then resolves the reference and returns the model

    ref = @get(ref_name)
    if ref
      return @resolve_ref(ref)

  sync : (method, model, options) ->
    # this should be fixed via monkey patching when extended by an
    # environment that implements the model backend,
    # to enable normal beaviour, add this line
    #
    # HasProperties.prototype.sync = Backbone.sync
    return options.success(model)

class BBoilerplate.BasicView extends Backbone.View
  initialize : (options) ->
    #autogenerates id
    if not _.has(options, 'id')
      this.id = _.uniqueId('BasicView')
  remove : ->
    #handles lifecycle of events bound by safebind

    if _.has(this, 'eventers')
      for own target, val of @eventers
        val.off(null, null, this)
    @trigger('remove')
    super()

  mget : ()->
    # convenience function, calls get on the associated model

    return @model.get.apply(@model, arguments)

  mset : ()->
    # convenience function, calls set on the associated model

    return @model.set.apply(@model, arguments)

  mget_ref : (fld) ->
    # convenience function, calls get_ref on the associated model

    return @model.get_ref(fld)


build_views = (mainmodel, view_storage, view_specs, options, view_options) ->
  # ## function : build_views
  # convenience function for creating a bunch of views from a spec
  # and storing them in a dictionary keyed off of model id.
  # views are automatically passed the model that they represent

  # ####Parameters
  # * mainmodel : model which is constructing the views, this is used to resolve
  #   specs into other model objects
  # * view_storage : where you want the new views stored.  this is a dictionary
  #   views will be keyed by the id of the underlying model
  # * view_specs : list of view specs.  view specs are bboilerplate references to models
  #   the views constructor here, as an 'options' field in the dict
  # * options : any additional option to be used in the construction of views
  # * view_option : array, optional view specific options passed in to the construction of the view
  created_views = []
  valid_viewmodels = {}
  for spec in view_specs
    valid_viewmodels[spec.id] = true
  for spec, idx in view_specs
    if view_storage[spec.id]
      continue
    model = mainmodel.resolve_ref(spec)
    if view_options
      view_specific_option = view_options[idx]
    else
      view_specific_option = {}
    temp = _.extend({}, view_specific_option, spec.options, options, {'model' : model})
    view_storage[model.id] = new model.default_view(temp)
    created_views.push(view_storage[model.id])
  for own key, value of view_storage
    if not valid_viewmodels[key]
      value.remove()
      delete view_storage[key]
  return created_views

BBoilerplate.build_views = build_views
