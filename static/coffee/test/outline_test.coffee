test('add_child', ->
  node = Efficiently.outlinenodes.create({'text' : 'foo'})
  node2 = Efficiently.outlinenodes.create({'text' : 'foo2'})
  node.add_child(node2)
  ok(node.get('children').indexOf(node2.id) >= 0)
  ok(node2.get('parent') == node.id)
  return null
)

multinode_setup = () ->
  node = Efficiently.outlinenodes.create({'text' : 'foo'})
  node2 = Efficiently.outlinenodes.create({'text' : 'foo2'})
  node3 = Efficiently.outlinenodes.create({'text' : 'foo3'})
  node4 = Efficiently.outlinenodes.create({'text' : 'foo4'})
  node.add_child(node2)
  node.add_child(node4)
  node.add_child(node3, 1)
  return [node, node2, node3, node4]

deepmultinode_setup = ()->
  node = Efficiently.outlinenodes.create({'text' : 'foo'})
  node2 = Efficiently.outlinenodes.create({'text' : 'foo2'})
  node3 = Efficiently.outlinenodes.create({'text' : 'foo3'})
  node4 = Efficiently.outlinenodes.create({'text' : 'foo4'})
  node.add_child(node2)
  node2.add_child(node3)
  node3.add_child(node4)
  return [node, node2, node3, node4]

test('add_child_index', ->
  nodes = multinode_setup()
  node = nodes[0]
  node2 = nodes[1]
  node3 = nodes[2]
  node4 = nodes[3]
  ok(node.get('children').indexOf(node2.id) == 0)
  ok(node.get('children').indexOf(node4.id) == 2)
  ok(node.get('children').indexOf(node3.id) == 1)
  ok(node2.get('parent') == node.id)
  ok(node3.get('parent') == node.id)
  ok(node4.get('parent') == node.id)
  return null
)


test('remove', ->
  nodes = multinode_setup()
  node = nodes[0]
  node3 = nodes[2]
  node.remove_child(node3)
  ok(node.get('children').indexOf(node3.id) == -1)
  ok(node3.get('parent') == null)
  return null
)

test('tree_apply', ->
  nodes = deepmultinode_setup()
  node = nodes[0]
  node2 = nodes[1]
  node3 = nodes[2]
  node4 = nodes[3]
  func = (node) ->
    node.set('text', 'monkey')
  node.tree_apply(func, 2)
  ok(node.get('text') == 'monkey')
  ok(node2.get('text') == 'monkey')
  ok(node3.get('text') == 'monkey')
  ok(node4.get('text') != 'monkey')
  nodes = deepmultinode_setup()
  node = nodes[0]
  node2 = nodes[1]
  node3 = nodes[2]
  node4 = nodes[3]
  node.tree_apply(func, null)
  ok(node.get('text') == 'monkey')
  ok(node2.get('text') == 'monkey')
  ok(node3.get('text') == 'monkey')
  ok(node4.get('text') == 'monkey')
)