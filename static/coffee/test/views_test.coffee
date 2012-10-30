deepmultinode_setup = ()->
  node = Efficiently.outlinenodes.create({'text' : 'foo'})
  node2 = Efficiently.outlinenodes.create({'text' : 'foo2'})
  node3 = Efficiently.outlinenodes.create({'text' : 'foo3'})
  node4 = Efficiently.outlinenodes.create({'text' : 'foo4'})
  node.add_child(node2)
  node2.add_child(node3)
  node2.add_child(node4)
  return [node, node2, node3, node4]

test('basicview', ()->
  nodes = deepmultinode_setup()
  node = nodes[0]
  node2 = nodes[1]
  node3 = nodes[2]
  node4 = nodes[3]
  view = Efficiently.BasicNodeView::make_view(node)
  $('#test1').append(view.$el)
  childnode = $('#test1').find(".children:first")
  ok($($('#test1').find('.outline')[0]).find('.children:first').children().length == 1)
  ok($($('#test1').find('.outline')[1]).find('.children:first').children().length == 2)
  ok($($('#test1').find('.outline')[2]).find('.children:first').children().length == 0)
  ok($($('#test1').find('.outline')[3]).find('.children:first').children().length == 0)
)

test('hide_children_test', ()->
  nodes = deepmultinode_setup()
  node = nodes[0]
  node2 = nodes[1]
  node3 = nodes[2]
  node4 = nodes[3]
  view = Efficiently.BasicNodeView::make_view(node)
  view2 = view.childrenview.views[node2.id]
  view3 = view2.childrenview.views[node3.id]
  view4 = view2.childrenview.views[node4.id]
  ok(view2.view_model.get('hide_children') == false)
  view3.view_model.set('hide', true)
  view4.view_model.set('hide', true)
  ok(view2.view_model.get('hide_children') == true)
)