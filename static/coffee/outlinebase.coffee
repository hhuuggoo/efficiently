if this.Efficiently
  Efficiently = this.Efficiently
else
  Efficiently = {}
  this.Efficiently = Efficiently

class Efficiently.EfficientlyModel extends HasProperties.HasProperties

  url : () ->
    return super()

  sync : (method, model, options) ->
    # this should be fixed via monkey patching when extended by an
    # environment that implements the model backend,
    # to enable normal beaviour, add this line
    #
    # HasProperties.prototype.sync = Backbone.sync
    return options.success(model)


class Efficiently.OutlineNode extends Efficiently.EfficientlyModell
  collection_ref : ['Efficiently', 'outlinenodes']
  defaults:
    documentids : null
    text : ''
    date : null
    parent : null
    children : null
  add_child : (child, index) ->


class Efficiently.OutlineNodes extends Backbone.Collection
  model : Efficiently.OutlineNode
  url : ''

Efficiently.outlinenodes = new Efficiently.OutlineNodes()