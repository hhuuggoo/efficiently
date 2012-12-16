Efficiently.parentheses_words = (input_string) ->
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


`
function parentheses_words2(input_string){
    input_string = input_string.trim();
    var start = 0;
    var words = [];
    var token;
    var matching_parens = 0;
    for (i=0; i<input_string.length; i++){
	    if (input_string[i] == "("){
	        if (!matching_parens){
		        start = i;
	        }
	        matching_parens += 1;
	    }
	    if (matching_parens && input_string[i] == ")"){
	        matching_parens -= 1;
	        if (matching_parens == 0){
		        token = input_string.slice(start, i + 1);
		        words.push(token);
		        start = i+1;
	        }
	    }
	    if (!matching_parens && input_string[i] == " "){
	        words.push(input_string.slice(start, i+1));
	        start = i + 1;
	    }
    }

    words.push(input_string.slice(start, i+1));
    words = _.filter(words, function(x){return x != ' ' && x});
    words = _.map(words, function(x){return x.trim()});
    return words;
}

`
Efficiently.parentheses_words2 = parentheses_words2