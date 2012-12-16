// Generated by CoffeeScript 1.3.3
(function() {
  var eval_expression_graph, eval_match, expression_graph, get_tags, parentheses_words;

  parentheses_words = function(input_string) {
    var char, i, matching_parens, start, token, words, _i, _len;
    input_string = input_string.trim();
    start = 0;
    words = [];
    token;

    matching_parens = 0;
    for (i = _i = 0, _len = input_string.length; _i < _len; i = ++_i) {
      char = input_string[i];
      if (char === "(") {
        if (!matching_parens) {
          start = i;
        }
        matching_parens += 1;
      }
      if (matching_parens && char === ")") {
        matching_parens -= 1;
        if (matching_parens === 0) {
          token = input_string.slice(start, i + 1 || 9e9);
        }
        words.push(token);
        start = i + 1;
      }
      if (!matching_parens && char === " ") {
        words.push(input_string.slice(start, i + 1 || 9e9));
        start = i + 1;
      }
    }
    words.push(input_string.slice(start, i + 1 || 9e9));
    words = _.filter(words, function(x) {
      return x !== ' ' && x;
    });
    words = _.map(words, function(x) {
      return x.trim();
    });
    return words;
  };

  expression_graph = function(input_string) {
    var currop, currword, globalop, idx, newop, set_right_op, word, words, _i, _len;
    words = parentheses_words(input_string);
    globalop = null;
    currop = null;
    newop = null;
    idx = 0;
    set_right_op = function(newop) {
      if (!currop) {
        currop = newop;
        return globalop = newop;
      } else if ('right' in currop) {
        return console.log('ERROR', input_string, currword);
      } else {
        currop.right = newop;
        return currop = newop;
      }
    };
    for (_i = 0, _len = words.length; _i < _len; _i++) {
      word = words[_i];
      currword = word;
      if (word === 'and' || word === 'or') {
        newop = {
          op: word,
          left: globalop
        };
        globalop = newop;
        currop = newop;
      } else if (word === 'not') {
        newop = {
          op: 'not'
        };
        set_right_op(newop);
      } else if (word.indexOf("(") === 0) {
        newop = expression_graph(word.slice(1, word.length - 1));
        set_right_op(newop);
      } else {
        newop = {
          op: 'match',
          arg: word
        };
        set_right_op(newop);
      }
    }
    return globalop;
  };

  eval_match = function(arg, txt, tags) {
    if (tags.arg) {
      return true;
    }
    if (txt.indexOf(arg) >= 0) {
      return true;
    }
    return false;
  };

  eval_expression_graph = function(op, txt, tags) {
    var result;
    if (op.op === 'and') {
      result = eval_expression_graph(op.left, txt, tags);
      result = result && eval_expression_graph(op.right, txt, tags);
      return result;
    } else if (op.op === 'or') {
      result = eval_expression_graph(op.left, txt, tags);
      result = result || eval_expression_graph(op.right, txt, tags);
      return result;
    } else if (op.op === 'not') {
      return !eval_expression_graph(op.right, txt, tags);
    }
    return eval_match(op.arg, txt, tags);
  };

  get_tags = function(txt, regexes) {
    var match, matches, regex, tags, _i, _j, _len, _len1;
    tags = {};
    if (!txt) {
      return tags;
    }
    matches;

    for (_i = 0, _len = regexes.length; _i < _len; _i++) {
      regex = regexes[_i];
      matches = txt.match(regex);
      matches = _.map(matches, function(x) {
        return x.trim();
      });
      for (_j = 0, _len1 = matches.length; _j < _len1; _j++) {
        match = matches[_j];
        tags[match] = true;
      }
    }
    return tags;
  };

  Efficiently.get_tags = get_tags;

  Efficiently.eval_expression_graph = eval_expression_graph;

  Efficiently.expression_graph = expression_graph;

  Efficiently.parentheses_words = parentheses_words;

}).call(this);
