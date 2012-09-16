if this.Efficiently
  Efficiently = this.Efficiently
else
  Efficiently = {}
  this.Efficiently = Efficiently

class Efficiently.EfficientlyModel extends BBoilerplate.HasProperties

  url : () ->
    return super()


class Efficiently.BasicNodeView extends BBoilerplate.BasicView
  initialize : (options) ->
    super(options)
    BBoilerplate.safebind(this, @model, "destroy", @destroy)
    options.parentview = this
    @mainview = new Efficiently.BasicNodeMainView(options)
    @childrenview = new Efficiently.BasicChildrenView(options)
    @render()

  render : () ->
    @mainview.$el.detach()
    @childrenview.$el.detach()
    @$el.addClass('outline')
    @$el.addClass('clearfix')
    @$el.append(@mainview.$el)
    @$el.append(@childrenview.$el)

  remove : () ->
    @mainview.remove()
    @childrenview.remove()
    super()

class Efficiently.OutlineNode extends Efficiently.EfficientlyModel
  default_view : Efficiently.BasicNodeView
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
    chidden : null

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

class Efficiently.BasicNodeMainView extends BBoilerplate.BasicView
  initialize : (options) ->
    super(options)
    BBoilerplate.safebind(this, @model, "change", @render)
    @parentview = options.parentview
    @render()
  render : (options) ->
    @$el.html(Efficiently.main_node_template(
      text : @mget('text'),
      chidden : false
    ))

class Efficiently.BasicChildrenView extends BBoilerplate.BasicView
  initialize : (options) ->
    super(options)
    @parentview = options.parentview
    BBoilerplate.safebind(this, @model, "change:children", @render)
    @views = {}
    @render()

  build_views : (options) ->
    children = @model.get_all_children()
    child_refs = (model.ref() for model in children)
    BBoilerplate.build_views(@model, @views, child_refs)

  render : () ->
    @build_views()
    for own key, view of @views
      view.$el.detach()
    @$el.html('')
    @$el.html(Efficiently.children_node_template({}))
    child_container = @$el.find('.children')
    for childid in @mget('children')
      child_container.append(@views[childid].$el)
