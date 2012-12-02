if this.Efficiently
  Efficiently = this.Efficiently
else
  Efficiently = {}
  this.Efficiently = Efficiently

class Efficiently.EfficientlyModel extends BBoilerplate.HasProperties

  url : () ->
    return super()


class Efficiently.BasicNodeView extends BBoilerplate.BasicView
  remove : () ->
    @docview.remove(this, @viewstate)
    return super()

  initialize : (options) ->
    super(options)
    @viewstate = options.viewstate
    @docview = options.docview
    BBoilerplate.safebind(this, @model, "destroy", @destroy)
    @mainview = new Efficiently.BasicNodeContentView(options)
    @childrenview = new Efficiently.BasicChildrenView(options)
    @render()

  make_view : (model, options) ->
    options = options || {}
    options = _.extend({}, options)
    viewstate = new Efficiently.OutlineViewState({'model' : model})
    options.model = model
    options.viewstate = viewstate
    return new Efficiently.BasicNodeView(options)

  render : () ->
    @mainview.$el.detach()
    @childrenview.$el.detach()
    @$el.addClass('outline')
    @$el.addClass('clearfix')
    @$el.append(@mainview.$el)
    if @mget('children').length != 0
      @$el.append(@childrenview.$el)

  remove : () ->
    @mainview.remove()
    @childrenview.remove()
    super()

  hide : () ->
    @hide = true
    @$el.hide()

  show : () ->
    @hide = false
    @$el.show()

class Efficiently.OutlineViewState extends Efficiently.EfficientlyModel
  defaults :
    hide : false
    edit : false

  set_child_viewstates : (child_viewstates) ->
    if _.has(@properties, 'hide_children')
      @remove_property("hide_children")
    @register_property('hide_children', () ->
        return _.all(child_viewstates, ((model) -> model.get('hide')))
      , null, false
    )


class Efficiently.KeyEventer extends BBoilerplate.BasicView
  initialize : (options) ->
    super(options)
    @docview = options.docview

  delegateEvents : (events) ->
    super(events)
    $(document).bind('keydown.keyeventer', @keydown)

  undelegateEvents : (events) ->
    super(events)
    $(document).unbind('keydown.keyeventer')

  keydown : (e) =>
    func = @get_keyfunction(e)
    if (func)
      func()
      return false
    else
      return true

class Efficiently.DocView extends Efficiently.BasicNodeView
  initialize : (options) ->
    @nodeviews = {}
    @viewstates = {}
    @root = options.root
    @model = options.root
    BBoilerplate.safebind(this, @model, "destroy", @destroy)
    viewstate = new Efficiently.OutlineViewState({
      model : @root
    })
    view = new Efficiently.BasicChildrenView(
          model : @root
          viewstate : viewstate
          docview : this
        )
    @register(@root.id, this, viewstate)
    @childrenview = view
    @render()

    return this

  render : () ->
    @$el.html('')
    @$el.append(@childrenview.$el)

  remove : (id, view, viewstate) ->
    delete @nodeviews[id]
    delete @viewstates[id]
    return

  register : (id, view, viewstate) ->
    @nodeviews[id] = view
    @viewstates[id] = viewstate
    return

  make_view : (model, options) ->
    options = options || {}
    options = _.extend({}, options)
    options.docview = this
    view = Efficiently.BasicNodeView::make_view(model, options)
    viewstate = view.viewstate
    @register(model.id, view, viewstate)
    return view

  children : (node, visible) ->
    if not visible
      return node.get_all_children()
    viewstate = @viewstates[node.id]
    if viewstate.get('hide_children')
      return []
    else
      children = node.get_all_children()
      children = _.filter(children, (child) =>
        return not @viewstates[child.id].get('hide')
      )
      return children

  lower_sibling : (node, visible) ->
    parent = node.get_parent()
    if not parent
      return null
    siblings = @children(parent, visible)
    siblingids = _.map(siblings, (x) -> x.get('id'))
    curridx = _.indexOf(siblingids, node.id)
    if curridx < (siblings.length - 1)
      return siblings[curridx + 1]
    else
      return null

  lower_node : (node, visible) ->
    children = @children(node, visible)
    if children.length > 0
      return children[0]
    else
      nodeiter = node
      while (true)
        lower_sibling = @lower_sibling(nodeiter, visible)
        if !lower_sibling and nodeiter.id != @root.id
          nodeiter = nodeiter.get_parent()
        else if !lower_sibling and nodeiter.id == @root.id
          return null
        else if lower_sibling
          return lower_sibling

  upper_sibling : (node, visible) ->
    parent = node.get_parent()
    if !parent
      return null
    siblings = @children(parent, visible)
    siblingids = _.map(siblings, (x) -> x.get('id'))
    curridx = _.indexOf(siblingids, node.id)
    if curridx != 0
      return siblings[curridx - 1]
    else
      return null

  bottom_most_descendant: (node, visible) ->
    nodeiter = node
    while true
      children = @children(nodeiter, visible)
      if children.length == 0
        return nodeiter
      else
        nodeiter = _.last(children)
    return null

  upper_node : (node, visible) ->
    parent = node.get_parent()
    upper_sibling = @upper_sibling(node, visible)
    if !upper_sibling
      return parent
    else
      return @bottom_most_descendant(upper_sibling, visible)
    return null

class Efficiently.OutlineViewStates extends Backbone.Collection
  model : Efficiently.OutlineViewState
  url : ''

class Efficiently.OutlineNode extends Efficiently.EfficientlyModel
  collection_ref : ['Efficiently', 'outlinenodes']
  initialize : (attrs, options) ->
    super(attrs, options)
    if _.isNull(attrs.children)
      this.set('children', [])
    if _.isNull(attrs.date)
      this.set('children', [])

  defaults:
    documentids : null
    text : ''
    parent : null
    children : null

  add_child : (child, index) ->
    children = @get('children')
    if not index
      children.push(child.id)
    else
      children.splice(index, 0, child.id)
    @set('children', children)
    child.set('parent', @id)
    this.save()
    child.save()
    return child

  get_child : (index) ->
    return @collection.get(@get('children')[index])

  get_parent : () ->
    return @collection.get(@get('parent'))

  get_all_children : () ->
    return (@collection.get(x) for x in @get('children'))

  remove_child : (child) ->
    child.set('parent', null);
    child.save();
    children = @get('children')
    children = _.filter(children, ((x) -> return x != child.id))
    @set('children', children);
    @save()

  tree_apply : (func, level) ->
    func(this);
    if level > 0
      newlevel = level - 1
    else if _.isNull(level)
      newlevel = null
    else
      return null
    children = @get('children')
    for childid in children
      child = @collection.get(childid)
      child.tree_apply(func, newlevel)
    return null



class Efficiently.OutlineNodes extends Backbone.Collection
  model : Efficiently.OutlineNode
  url : ''

Efficiently.outlinenodes = new Efficiently.OutlineNodes()


$(() ->
  Efficiently.main_node_template = _.template($('#main-template').html())
  Efficiently.children_node_template = _.template($('#children-template').html())
)

class Efficiently.BasicNodeContentView extends BBoilerplate.BasicView
  events :
    'click'  : 'edit'
    'focusout' : 'save'

  edit : () ->
    @viewstate.set('edit', true)
    @$el.find('.outline-input').focus()

  save : () ->
    @model.set('text', @$el.find('.outline-input').val())
    @viewstate.set('edit', false)

  initialize : (options) ->
    super(options)
    @viewstate = options.viewstate
    @docview = options.docview
    BBoilerplate.safebind(this, @model, "change", @render)
    BBoilerplate.safebind(this, @viewstate, "change", @render)
    @render()

  render : (options) ->
    @$el.html(Efficiently.main_node_template(
      text : @mget('text'),
      chidden : false
      edit : @viewstate.get('edit')
    ))
    @$el.addClass("content clearfix")
    node = @$el.find('textarea')
    node.height(0)
    node.autoResize()
    node.val(@mget('text'))
    if @viewstate.get('edit')
      _.defer((()->node.resizeNow.call(node)))
      window.setTimeout(() =>
          node.resizeNow.call(node)
        , 100
      )

class Efficiently.BasicChildrenView extends BBoilerplate.BasicView
  initialize : (options) ->
    super(options)
    @viewstate = options.viewstate
    @docview = options.docview
    BBoilerplate.safebind(this, @model, "change:children", @render)
    @views = {}
    @render()

  build_views : (options) ->
    children = @model.get_all_children()
    child_refs = (model.ref() for model in children)
    BBoilerplate.build_views(@views, child_refs, (ref) =>
      if @docview
        return @docview.make_view(@model.resolve_ref(ref))
      else
        return Efficiently.BasicNodeView::make_view(@model.resolve_ref(ref))
    )

  render : () ->
    @build_views()
    @viewstate.set_child_viewstates(
      _.map(@views, ((x) -> return x.viewstate))
    )
    for own key, view of @views
      view.$el.detach()
    @$el.html('')
    @$el.addClass("childrenview clearfix")
    @$el.html(Efficiently.children_node_template({}))
    child_container = @$el.find('.children')
    for childid in @mget('children')
      child_container.append(@views[childid].$el)
