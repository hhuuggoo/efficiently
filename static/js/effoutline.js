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

    return EfficientlyModel;

  })(BBoilerplate.HasProperties);

  Efficiently.BasicNodeView = (function(_super) {

    __extends(BasicNodeView, _super);

    function BasicNodeView() {
      return BasicNodeView.__super__.constructor.apply(this, arguments);
    }

    BasicNodeView.prototype.initialize = function(options) {
      BasicNodeView.__super__.initialize.call(this, options);
      BBoilerplate.safebind(this, this.model, "destroy", this.destroy);
      options.parentview = this;
      this.mainview = new Efficiently.BasicNodeMainView(options);
      this.childrenview = new Efficiently.BasicChildrenView(options);
      return this.render();
    };

    BasicNodeView.prototype.make_view = function(model) {
      var view_model;
      view_model = new Efficiently.OutlineViewModel({
        'model': model
      });
      return new Efficiently.BasicNodeView({
        model: model,
        view_model: view_model
      });
    };

    BasicNodeView.prototype.render = function() {
      this.mainview.$el.detach();
      this.childrenview.$el.detach();
      this.$el.addClass('outline');
      this.$el.addClass('clearfix');
      this.$el.append(this.mainview.$el);
      return this.$el.append(this.childrenview.$el);
    };

    BasicNodeView.prototype.remove = function() {
      this.mainview.remove();
      this.childrenview.remove();
      return BasicNodeView.__super__.remove.call(this);
    };

    BasicNodeView.prototype.hide = function() {
      this.hide = true;
      return this.$el.hide();
    };

    BasicNodeView.prototype.show = function() {
      this.hide = false;
      return this.$el.show();
    };

    return BasicNodeView;

  })(BBoilerplate.BasicView);

  Efficiently.OutlineViewModel = (function(_super) {

    __extends(OutlineViewModel, _super);

    function OutlineViewModel() {
      return OutlineViewModel.__super__.constructor.apply(this, arguments);
    }

    OutlineViewModel.prototype.defaults = {
      hide: false
    };

    return OutlineViewModel;

  })(Efficiently.EfficientlyModel);

  Efficiently.OutlineNode = (function(_super) {

    __extends(OutlineNode, _super);

    function OutlineNode() {
      return OutlineNode.__super__.constructor.apply(this, arguments);
    }

    OutlineNode.prototype.collection_ref = ['Efficiently', 'outlinenodes'];

    OutlineNode.prototype.initialize = function(attrs, options) {
      OutlineNode.__super__.initialize.call(this, attrs, options);
      if (_.isNull(attrs.children)) {
        this.set('children', []);
      }
      if (_.isNull(attrs.date)) {
        return this.set('children', []);
      }
    };

    OutlineNode.prototype.defaults = {
      documentids: null,
      text: '',
      parent: null,
      children: null
    };

    OutlineNode.prototype.add_child = function(child, index) {
      var children;
      children = this.get('children');
      if (!index) {
        children.push(child.id);
      } else {
        children.splice(index, 0, child.id);
      }
      this.set('children', children);
      child.set('parent', this.id);
      this.save();
      child.save();
      return child;
    };

    OutlineNode.prototype.get_child = function(index) {
      return this.collection.get(this.get('children')[index]);
    };

    OutlineNode.prototype.get_all_children = function() {
      var x;
      return (function() {
        var _i, _len, _ref, _results;
        _ref = this.get('children');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          x = _ref[_i];
          _results.push(this.collection.get(x));
        }
        return _results;
      }).call(this);
    };

    OutlineNode.prototype.visible_children = function() {
      var children;
      return children = this.get_all_children();
    };

    OutlineNode.prototype.remove_child = function(child) {
      var children;
      child.set('parent', null);
      child.save();
      children = this.get('children');
      children = _.filter(children, (function(x) {
        return x !== child.id;
      }));
      this.set('children', children);
      return this.save();
    };

    OutlineNode.prototype.tree_apply = function(func, level) {
      var child, childid, children, newlevel, _i, _len;
      func(this);
      if (level > 0) {
        newlevel = level - 1;
      } else if (_.isNull(level)) {
        newlevel = null;
      } else {
        return null;
      }
      children = this.get('children');
      for (_i = 0, _len = children.length; _i < _len; _i++) {
        childid = children[_i];
        child = this.collection.get(childid);
        child.tree_apply(func, newlevel);
      }
      return null;
    };

    return OutlineNode;

  })(Efficiently.EfficientlyModel);

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

  $(function() {
    Efficiently.main_node_template = _.template($('#main-template').html());
    return Efficiently.children_node_template = _.template($('#children-template').html());
  });

  Efficiently.BasicNodeMainView = (function(_super) {

    __extends(BasicNodeMainView, _super);

    function BasicNodeMainView() {
      return BasicNodeMainView.__super__.constructor.apply(this, arguments);
    }

    BasicNodeMainView.prototype.initialize = function(options) {
      BasicNodeMainView.__super__.initialize.call(this, options);
      BBoilerplate.safebind(this, this.model, "change", this.render);
      this.parentview = options.parentview;
      return this.render();
    };

    BasicNodeMainView.prototype.render = function(options) {
      this.$el.html(Efficiently.main_node_template({
        text: this.mget('text'),
        chidden: false
      }));
      return this.$el.addClass("content clearfix");
    };

    return BasicNodeMainView;

  })(BBoilerplate.BasicView);

  Efficiently.BasicChildrenView = (function(_super) {

    __extends(BasicChildrenView, _super);

    function BasicChildrenView() {
      return BasicChildrenView.__super__.constructor.apply(this, arguments);
    }

    BasicChildrenView.prototype.initialize = function(options) {
      BasicChildrenView.__super__.initialize.call(this, options);
      this.parentview = options.parentview;
      BBoilerplate.safebind(this, this.model, "change:children", this.render);
      this.views = {};
      return this.render();
    };

    BasicChildrenView.prototype.build_views = function(options) {
      var child_refs, children, model,
        _this = this;
      children = this.model.get_all_children();
      child_refs = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = children.length; _i < _len; _i++) {
          model = children[_i];
          _results.push(model.ref());
        }
        return _results;
      })();
      return BBoilerplate.build_views(this.views, child_refs, function(ref) {
        return _this.parentview.make_view(_this.model.resolve_ref(ref));
      });
    };

    BasicChildrenView.prototype.render = function() {
      var child_container, childid, key, view, _i, _len, _ref, _ref1, _results;
      this.build_views();
      _ref = this.views;
      for (key in _ref) {
        if (!__hasProp.call(_ref, key)) continue;
        view = _ref[key];
        view.$el.detach();
      }
      this.$el.html('');
      this.$el.addClass("children clearfix");
      this.$el.html(Efficiently.children_node_template({}));
      child_container = this.$el.find('.children');
      _ref1 = this.mget('children');
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        childid = _ref1[_i];
        _results.push(child_container.append(this.views[childid].$el));
      }
      return _results;
    };

    return BasicChildrenView;

  })(BBoilerplate.BasicView);

}).call(this);
