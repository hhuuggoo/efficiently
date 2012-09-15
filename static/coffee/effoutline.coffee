if this.Efficiently
  Efficiently = this.Efficiently
else
  Efficiently = {}
  this.Efficiently = Efficiently

class Efficiently.EfficientlyModel extends BBoilerplate.HasProperties

  url : () ->
    return super()



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