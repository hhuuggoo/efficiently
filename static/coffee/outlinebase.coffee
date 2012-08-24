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


Collections