test('add_child', ->
  node = Efficiently.outlinenodes.create({'text' : 'foo'})
  node2 = Efficiently.outlinenodes.create({'text' : 'foo2'})
  node.add_child(node2)
  ok(node.get('children').indexOf(node2.id) >= 0)
  ok(node2.get('parent') == node.id)
  return null
)
test('add_child_index', ->
  node = Efficiently.outlinenodes.create({'text' : 'foo'})
  node2 = Efficiently.outlinenodes.create({'text' : 'foo2'})
  node3 = Efficiently.outlinenodes.create({'text' : 'foo3'})
  node4 = Efficiently.outlinenodes.create({'text' : 'foo4'})
  node.add_child(node2)
  node.add_child(node4)
  node.add_child(node3, 1)
  ok(node.get('children').indexOf(node2.id) == 0)
  ok(node.get('children').indexOf(node4.id) == 2)
  ok(node.get('children').indexOf(node3.id) == 1)
  ok(node2.get('parent') == node.id)
  ok(node3.get('parent') == node.id)
  ok(node4.get('parent') == node.id)
  return null
)