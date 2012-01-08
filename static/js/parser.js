function parentheses_words(input_string){
    input_string = _.strip(input_string);
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
		words.push(token)
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
    words = _.map(words, function(x){return _.strip(x)});
    return words;
}


function expression_graph(input_string){
    words = parentheses_words(input_string);
    //var global_op = null;
    var global_op = null;
    var curr_op = null;
    var new_op = null;
    var idx = 0;
    var currword;
    var set_right_op = function(new_op){
	if (!curr_op){
	    curr_op = new_op;
	    global_op = new_op;
	}else if ('right' in curr_op){
	    console.log(['ERROR', input_string, currword])
	}else{
	    curr_op['right'] = new_op;
	    curr_op = new_op;
	}
    } 
    _.each(words, function(word){
	currword = word;
	if (word == 'and' || word == 'or'){
	    new_op = {'op' : word,
		      'left' : global_op};
	    global_op = new_op;
	    curr_op = new_op;
	}else if (word == 'not'){
	    new_op = {'op' : 'not'};
	    set_right_op(new_op);
	}else if (_.startsWith(word, '(')){
	    new_op = expression_graph(word.slice(1, word.length - 1));
	    set_right_op(new_op);
	}else{
	    new_op = {'op' : 'match',
		      'arg' : word};
	    set_right_op(new_op);
	}
    });
    return global_op;
}
function eval_match(arg, txt, tags){
    if (tags[arg]){
	return true;
    }
    if (txt.indexOf(arg) >= 0){
	return true;
    }
    return false;
}

function eval_expression_graph(op, txt, tags){
    if (op['op'] == 'and'){
	return eval_expression_graph(op['left'], txt, tags) && eval_expression_graph(op['right'], txt, tags)
    }else if (op['op'] == 'or'){
	return eval_expression_graph(op['left'], txt, tags) || eval_expression_graph(op['right'], txt, tags)
    }else if (op['op'] == 'not'){
	return !eval_expression_graph(op['right'], txt, tags);
    }else{
	return eval_match(op['arg'], txt, tags);
    }
}

function get_tags(txt, regexes){
    var tags = {};
    if (!txt){
	return tags;
    }
    var matches;
    _.each(regexes, function(x){
	matches = txt.match(x);
	matches = _.map(matches, function(x){return _.strip(x)});
	_.each(matches, function(match){
	    tags[match] = true;
	});
    });
    return tags
}
    
