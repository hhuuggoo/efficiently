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

class Efficiently.OutlineNodes extends Backbone.Collection
  model : Efficiently.OutlineNode
  url : ''

Efficiently.outlinenodes = new Efficiently.OutlineNodes()