parentheses_words = (input_string) ->
  input_string = input_string.trim()
  start = 0
  words = []
  token
  matching_parens = 0
  for char, i in input_string
    if char == "("
      if not matching_parens
        start = i
      matching_parens += 1
    if matching_parens and char == ")"
      matching_parens -= 1
      if matching_parens == 0
        token = input_string[start..i]
      words.push(token)
      start = i+1
    if not matching_parens and char == " "
      words.push(input_string[start..i])
      start = i + 1
  words.push(input_string[start..i])
  words = _.filter(words, (x) -> x != ' ' and x)
  words = _.map(words, (x) -> x.trim())
  return words

expression_graph = (input_string) ->
  words = parentheses_words(input_string)
  globalop = null
  currop = null
  newop = null
  idx = 0
  set_right_op = (newop) ->
    if not currop
      currop = newop
      globalop = newop
    else if 'right' of currop
      console.log('ERROR', input_string, currword)
    else
      currop.right = newop
      currop = newop
  for word in words
    currword = word
    if word =='and' or word == 'or'
      newop =
        op : word
        left : globalop
      globalop = newop
      currop = newop
    else if word == 'not'
      newop =
        op : 'not'
      set_right_op(newop)
    else if word.indexOf("(") == 0
      newop = expression_graph(word[1...word.length-1])
      set_right_op(newop)
    else
      newop =
        op : 'match'
        arg : word
      set_right_op(newop)
  return globalop

eval_match = (arg, txt, tags) ->
  if txt.indexOf("is your login") >= 0
    debugger
  if tags[arg]
    return true
  if txt.indexOf(arg) >= 0
    return true
  return false

eval_expression_graph = (op, txt, tags) ->
  if op.op == 'and'
    result = eval_expression_graph(op.left, txt, tags)
    result = result and eval_expression_graph(op.right, txt, tags)
    return result
  else if op.op == 'or'
    result = eval_expression_graph(op.left, txt, tags)
    result = result or eval_expression_graph(op.right, txt, tags)
    return result
  else if op.op == 'not'
    return not eval_expression_graph(op.right, txt, tags)
  return eval_match(op.arg, txt, tags)

get_tags = (txt, regexes) ->
  tags = {}
  if not txt
    return tags
  matches
  for regex in regexes
    matches = txt.match(regex)
    matches = _.map(matches, (x) -> x.trim())
    for match in matches
      tags[match] = true
  return tags

Efficiently.get_tags = get_tags
Efficiently.eval_expression_graph = eval_expression_graph
Efficiently.eval_match = eval_match
Efficiently.expression_graph = expression_graph
Efficiently.parentheses_words = parentheses_words
