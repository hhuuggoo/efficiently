// Generated by CoffeeScript 1.4.0
(function() {
  var deepmultinode_setup;

  deepmultinode_setup = function() {
    var doc, node, node2, node3, node4;
    doc = new Efficiently.Document();
    node = Efficiently.outlinenodes.create({
      'text': 'foo'
    }, {
      'doc': doc
    });
    node2 = Efficiently.outlinenodes.create({
      'text': 'foo2'
    }, {
      'doc': doc
    });
    node3 = Efficiently.outlinenodes.create({
      'text': 'foo3'
    }, {
      'doc': doc
    });
    node4 = Efficiently.outlinenodes.create({
      'text': 'foo4'
    }, {
      'doc': doc
    });
    node.add_child(node2);
    node2.add_child(node3);
    node2.add_child(node4);
    return [node, node2, node3, node4];
  };

  test('basicview', function() {
    var childnode, node, node2, node3, node4, nodes, view;
    nodes = deepmultinode_setup();
    node = nodes[0];
    node2 = nodes[1];
    node3 = nodes[2];
    node4 = nodes[3];
    view = new Efficiently.DocView({
      root: node
    });
    $('#test1').append(view.$el);
    childnode = $('#test1').find(".children:first");
    ok($('#test1').find('.children:first').children().length === 1);
    ok($($('#test1').find('.outline')[0]).find('.children:first').children().length === 2);
    ok($($('#test1').find('.outline')[1]).find('.children:first').children().length === 0);
    return ok($($('#test1').find('.outline')[2]).find('.children:first').children().length === 0);
  });

  test('hide_children_test', function() {
    var node, node2, node3, node4, node5, nodes, view, view2, view3, view4;
    nodes = deepmultinode_setup();
    node = nodes[0];
    node2 = nodes[1];
    node3 = nodes[2];
    node4 = nodes[3];
    view = new Efficiently.DocView({
      root: node
    });
    view2 = view.childrenview.views[node2.id];
    view3 = view2.childrenview.views[node3.id];
    view4 = view2.childrenview.views[node4.id];
    ok(!view2.viewstate.get('all_hidden'));
    ok(!view2.viewstate.get('any_hidden'));
    view3.viewstate.set('hide', true);
    ok(view2.viewstate.get('any_hidden'));
    ok(!view2.viewstate.get('all_hidden'));
    view4.viewstate.set('hide', true);
    ok(view2.viewstate.get('all_hidden'));
    node5 = Efficiently.outlinenodes.create({
      'text': 'foo'
    }, {
      'doc': node2.doc
    });
    view2.model.add_child(node5);
    ok(!view2.viewstate.get('all_hidden'));
    view2.childrenview.views[node5.id].viewstate.set('hide', true);
    return ok(view2.viewstate.get('all_hidden'));
  });

  test('doc_view', function() {
    var docview, node, node2, node3, node4, nodes, result, root;
    nodes = deepmultinode_setup();
    node = nodes[0];
    node2 = nodes[1];
    node3 = nodes[2];
    node4 = nodes[3];
    root = node;
    docview = new Efficiently.DocView({
      root: root,
      el: $('#test2')
    });
    ok($($('#test2').find('.outline')[0]).find('.children:first').children().length === 2);
    ok($($('#test2').find('.outline')[1]).find('.children:first').children().length === 0);
    ok($($('#test2').find('.outline')[2]).find('.children:first').children().length === 0);
    result = docview.lower_node(node3);
    ok(result === node4);
    result = docview.lower_node(node4);
    ok(result === null);
    result = docview.lower_node(node2);
    ok(result === node3);
    result = docview.lower_node(node);
    ok(result === node2);
    result = docview.upper_node(node3);
    ok(result === node2);
    result = docview.upper_node(node4);
    ok(result === node3);
    result = docview.upper_node(node2);
    return ok(result === node);
  });

  test('render_outline_test', function() {
    var node, node2, node3, node4, node5, nodes, view, view2, view3, view4, view5;
    nodes = deepmultinode_setup();
    node = nodes[0];
    node2 = nodes[1];
    node3 = nodes[2];
    node4 = nodes[3];
    view = new Efficiently.DocView({
      root: node,
      el: $('#render_outline_test')
    });
    view2 = view.childrenview.views[node2.id];
    view3 = view2.childrenview.views[node3.id];
    view4 = view2.childrenview.views[node4.id];
    node5 = Efficiently.outlinenodes.create({
      'text': 'foo'
    }, {
      'doc': node2.doc
    });
    node4.add_child(node5);
    view5 = view4.childrenview.views[node5.id];
    view2.viewstate.set('outline', 'show_children');
    ok(view2.$el.find('.children').is(":visible"));
    ok(!view2.viewstate.get('hide'));
    ok(view5.viewstate.get('hide'));
    ok(!view3.viewstate.get('hide'));
    ok(!view4.viewstate.get('hide'));
    view2.viewstate.set('outline', 'show_all');
    ok(view2.$el.find('.children').is(":visible"));
    ok(!view2.viewstate.get('hide'));
    ok(!view5.viewstate.get('hide'));
    ok(!view3.viewstate.get('hide'));
    ok(!view4.viewstate.get('hide'));
    view2.viewstate.set('outline', 'hide_all');
    ok(view3.viewstate.get('hide'));
    ok(view4.viewstate.get('hide'));
    ok(!view2.viewstate.get('hide'));
    return null;
  });

  test('toggle_todo_test', function() {
    var node, node2, node3, node4, nodes, view, view2;
    nodes = deepmultinode_setup();
    node = nodes[0];
    node2 = nodes[1];
    node3 = nodes[2];
    node4 = nodes[3];
    view = new Efficiently.DocView({
      root: node,
      el: $('#render_outline_test')
    });
    view2 = view.childrenview.views[node2.id];
    node2.toggle_todo_state();
    return ok(node2.get('text').indexOf("TODO") === 0);
  });

  test('tree_filter_test', function() {
    var node, node2, node3, node4, nodes, view, view2, view3, view4;
    nodes = deepmultinode_setup();
    node = nodes[0];
    node2 = nodes[1];
    node3 = nodes[2];
    node4 = nodes[3];
    view = new Efficiently.DocView({
      root: node,
      el: $('#tree_filter')
    });
    Efficiently.tree_filter("foo3", view);
    view2 = view.childrenview.views[node2.id];
    view3 = view2.childrenview.views[node3.id];
    view4 = view2.childrenview.views[node4.id];
    ok(view4.viewstate.get('hide'));
    ok(!view3.viewstate.get('hide'));
    return ok(!view2.viewstate.get('hide'));
  });

}).call(this);
