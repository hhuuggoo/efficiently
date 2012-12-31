// Generated by CoffeeScript 1.3.3
(function() {
  var Efficiently,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  if (this.Efficiently) {
    Efficiently = this.Efficiently;
  } else {
    Efficiently = {};
    this.Efficiently = Efficiently;
  }

  Efficiently.EfficientlyModel = (function(_super) {

    __extends(EfficientlyModel, _super);

    function EfficientlyModel() {
      return EfficientlyModel.__super__.constructor.apply(this, arguments);
    }

    EfficientlyModel.prototype.url = function() {
      return EfficientlyModel.__super__.url.call(this);
    };

    EfficientlyModel.prototype.sync = function(method, model, options) {
      return options.success(model);
    };

    return EfficientlyModel;

  })(HasProperties.HasProperties);

  Efficiently.OutlineNode = (function(_super) {

    __extends(OutlineNode, _super);

    function OutlineNode() {
      return OutlineNode.__super__.constructor.apply(this, arguments);
    }

    OutlineNode.prototype.collection_ref = ['Efficiently', 'outlinenodes'];

    OutlineNode.prototype.defaults = {
      documentids: null,
      text: '',
      date: null,
      parent: null,
      children: null
    };

    OutlineNode.prototype.add_child = function(child, index) {};

    return OutlineNode;

  })(Efficiently.EfficientlyModell);

  Efficiently.OutlineNodes = (function(_super) {

    __extends(OutlineNodes, _super);

    function OutlineNodes() {
      return OutlineNodes.__super__.constructor.apply(this, arguments);
    }

    OutlineNodes.prototype.model = Efficiently.OutlineNode;

    OutlineNodes.prototype.url = '';

    return OutlineNodes;

  })(Backbone.Collection);

  Efficiently.outlinenodes = new Efficiently.OutlineNodes();

}).call(this);