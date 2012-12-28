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

test('test_format_text', ->
  document = new Efficiently.Document()
  output = Efficiently.format_text("hello", document)
  ok(output == "hello")
  output = Efficiently.format_text("TODO hello", document)
  ok(output.search("<span style='color:red'>TODO </span>") == 0)

)

test('test_parse_text', ->
  document = new Efficiently.Document()
  output = Efficiently.parse_text("hello", document)
  ok(output.text == "hello")
  ok(_.isUndefined(output.todo) or _.isNull(output.todo))
  output = Efficiently.parse_text("INPROGRESS hello", document)
  ok(output.text == "INPROGRESS hello")
  ok(output.todo == "INPROGRESS")
)

test('test_set_text', ->
  document = new Efficiently.Document()
  output = Efficiently.set_text("hello", document, {'todo' : "INPROGRESS"})
  ok(output == "INPROGRESS hello")
  output = Efficiently.set_text("INPROGRESS hello", document, {'todo' : ''})
  ok(output == "hello")
  output = Efficiently.set_text("INPROGRESS hello", document,
    {'todo' : "DONE"})
  ok(output == "DONE hello")

)


test('test_parentheses_words', ->
  output = Efficiently.parentheses_words("A and (B and C)")
  ok(output[0] == "A")
  ok(output[1] == "and")
  ok(output[2] == "(B and C)")
  graph = Efficiently.expression_graph("A and (B and not C) or D")
  ok(Efficiently.eval_expression_graph(graph, "A B", {}))
  ok(not Efficiently.eval_expression_graph(graph, "A", {}))
  ok(Efficiently.eval_expression_graph(graph, "D", {}))
  ok(Efficiently.eval_expression_graph(graph, "A B", {}))
  ok(not Efficiently.eval_expression_graph(graph, "A B C", {}))
)