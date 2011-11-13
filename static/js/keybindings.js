var UP = 38;
var DOWN = 40;
var LEFT = 37;
var RIGHT = 39;
var TAB = 9;
var GE = 190;
var LT = 188;
var SLASH = 191;
var S_KEY = 83;
var F_KEY = 70;
var R_KEY = 82;
var P_KEY = 80;
var L_BRACKET = 219;
var R_BRACKET = 221;
var FADEOUT_DELAY = 4000;

ItemSelector = function(root_node, collections){
    var obj = this;
    this.collections = collections
    this.root_node = root_node;
    this.curr_node = null;
    this.curr_idx = 0;
    this.get_keyfunction = function(e){
        if (!e.ctrlKey && e.keyCode == UP){
	    return this.keyfunctions['cursor_up'];
	}else if (!e.ctrlKey && e.keyCode == DOWN){
            return this.keyfunctions['cursor_down'];
        }else if (e.ctrlKey && e.keyCode == UP){
	    return this.keyfunctions['move_up'];
        }else if (e.ctrlKey && e.keyCode == DOWN){
	    return this.keyfunctions['move_down'];
	}else if (e.ctrlKey && e.keyCode == LEFT){
	    return this.keyfunctions['move_left'];
        }else if (e.ctrlKey && e.keyCode == RIGHT){
	    return this.keyfunctions['move_right'];
	}else if (e.ctrlKey && e.keyCode == BACKSPACE){
	    return this.keyfunctions['delete'];
	}else if (e.keyCode == GE && e.altKey && !e.ctrlKey){
	    return this.keyfunctions['toggle_outline'];
	}else if (e.keyCode == SLASH && e.altKey && !e.ctrlKey){
	    return this.keyfunctions['toggle_all_outline'];
	}else if (e.keyCode == LT && e.altKey && !e.ctrlKey){
	    return this.keyfunctions['toggle_todo'];
	}else if (e.keyCode == P_KEY && e.altKey && !e.ctrlKey){
	    return this.keyfunctions['focus_isearch']
	}else if (e.keyCode == L_BRACKET && e.altKey && !e.ctrlKey){
	    return this.keyfunctions['isearch_down'];
	}else if (e.keyCode == R_BRACKET && e.altKey && !e.ctrlKey){
	    return this.keyfunctions['isearch_up'];
	}
	else{
	    return null;
	}
    }
    $(document).keydown(
	function(e){
	    var func = obj.get_keyfunction(e);
	    if (func){
		func.call(obj);
		if (!func.noselect){
		    obj.curr_node.select();
		}
		return false;
	    }else{
		return true;
	    }
	}
    );
    $(document).keyup(
	function(e){
	    var func = obj.get_keyfunction(e);
	    if (func){
		return false;
	    }else{
		return true;
	    }
	}
    );
    this.deletenode = function(){
	if (this.curr_node){
	    var parent = this.collections.get(this.curr_node.parent, 'outline')
	    var siblings = parent.visible_children()
	    var idx = _.indexOf(siblings, this.curr_node.id);
	    var next_current = null;
	    if (idx != 0){
		next_current = this.collections.get(siblings[idx - 1], 
						    'outline');
	    }else if (idx < siblings.length - 1){
		next_current = this.collections.get(siblings[idx + 1],
						    'outline');
	    }else{
		next_current = parent;
	    }
	    deletenode(this.curr_node);
	    this.curr_node = next_current;
	}
    }

    this.keyhandle = function(e){
        if (!e.ctrlKey && e.keyCode == UP){

        }else if (!e.ctrlKey && e.keyCode == DOWN){
            this.cursor_down();
        }else if (e.ctrlKey && e.keyCode == UP){
            this.move_up();
        }else if (e.ctrlKey && e.keyCode == DOWN){
            this.move_down();
	}else if (e.ctrlKey && e.keyCode == LEFT){
            this.move_left();
        }else if (e.ctrlKey && e.keyCode == RIGHT){
            this.move_right();
	}else if (e.ctrlKey && e.keyCode == BACKSPACE){
	    if (this.curr_node){
		var parent = this.collections.get(this.curr_node.parent, 'outline')
		var siblings = parent.visible_children()
		var idx = _.indexOf(siblings, this.curr_node.id);
		var next_current = null;
		if (idx != 0){
		    next_current = this.collections.get(siblings[idx - 1], 
							'outline');
		}else if (idx < siblings.length - 1){
		    next_current = this.collections.get(siblings[idx + 1],
							'outline');
		}else{
		    next_current = parent;
		}
		deletenode(this.curr_node);
		this.curr_node = next_current;
	    }
	}else if (e.keyCode == GE && e.altKey && !e.ctrlKey){
	    if (this.curr_node){
		this.curr_node.toggle_outline_state();
		this.curr_node.show_outline_state();
	    }
	}else if (e.keyCode == SLASH && e.altKey && !e.ctrlKey){
	    if (this.curr_node){
		this.root_node.toggle_child_outline_state();
	    }
	}else if (e.keyCode == LT && e.altKey && !e.ctrlKey){
	    if (this.curr_node){
		this.curr_node.toggle_todo_state();
	    }
	}else{
	    return true
	}
	this.curr_node.select();
	return false;
    }
    this.cursor_up = function(){
	if (!this.curr_node){
	    this.curr_node = this.collections.get(
		root.visible_children()[0], 'outline');
	}else{
	    this.curr_node.unselect();
	    var upper = this.find_upper_node(this.curr_node);
	    if (upper){
		this.curr_node = upper
	    }
	}
    };
    this.cursor_down = function(){
	if (!this.curr_node){
	    this.curr_node = this.collections.get(
		root.visible_children()[0], 'outline');
	}else{
	    this.curr_node.unselect();
	    var next_node = this.find_lower_visible_node(this.curr_node);
	    if (next_node){
		this.curr_node = next_node;
	    }
	}
    };
    this.lower_visible_sibling = function(node){
	var parent = this.collections.get(node.parent, 'outline');
	if (!parent){
	    return null;
	}
	var siblings = parent.visible_children();
	var curr_idx = _.indexOf(siblings, node.id);
	if (curr_idx < siblings.length - 1){
	    return this.collections.get(siblings[curr_idx + 1], 'outline');
	}else{
	    return null;
	}
    }
    this.upper_visible_sibling = function(node){
	var parent = this.collections.get(node.parent, 'outline');
	if (!parent){
	    return null;
	}
	var siblings = parent.visible_children();
	var curr_idx = _.indexOf(siblings, node.id);
	if (curr_idx != 0){
	    return this.collections.get(siblings[curr_idx - 1], 'outline');
	}else{
	    return null;
	}
    }
    this.bottom_most_visible_descendant = function(node){
	var children;
	var node_iter = node;
	while(true){
	    children = node_iter.visible_children()
	    if(children.length == 0){
		return node_iter;
	    }else{
		node_iter = this.collections.get(_.last(children), 'outline');
	    }
	}
    }
    this.find_upper_node = function(node){
	var parent = this.collections.get(node.parent, 'outline');
	var upper_sibling = this.upper_visible_sibling(node);
	if (!upper_sibling){
	    if (parent.id == this.root_node.id){
		return null;
	    }
	    return parent;
	}else{
	    return this.bottom_most_visible_descendant(upper_sibling);
	}
    }
    this.find_lower_visible_node = function(node){
	children = node.visible_children();
	if (children.length > 0){
	    return this.collections.get(children[0], 'outline');
	}
	var node_iter = node;
	while (true){
	    var lower_sibling = this.lower_visible_sibling(node_iter);
	    if (!lower_sibling && node_iter.id != this.root_node.id){
		node_iter = this.collections.get(node_iter.parent, 'outline');
	    }else if (!lower_sibling && node_iter.id == this.root_node.id){
		return null
	    }else if (lower_sibling){
		return lower_sibling;
	    }
	}
    }
    this.move_right = function(){
	var node = this.curr_node
	var parent = this.collections.get(node.parent, 'outline');
	var siblings = parent.visible_children()

	children = node.visible_children()
	var curr_idx = _.indexOf(siblings, node.id);
	if (curr_idx == 0){
	    return null;
	}else{
	    upper_sibling = this.collections.get(siblings[curr_idx - 1],
						 'outline');
	    parent.remove_child(node);
	    upper_sibling.add_child(node);
	    parent.render();
	    upper_sibling.render();
	}
    }
    this.move_left = function(){
	var node = this.curr_node
	var parent = this.collections.get(node.parent, 'outline');
	var grandparent = this.collections.get(parent.parent, 'outline');
	if (!grandparent || !parent){
	    return null;
	}
	var new_idx = _.indexOf(grandparent.visible_children(),
				parent.id) + 1;
	
	parent.remove_child(node);
	grandparent.add_child(node, new_idx);
	parent.render();
	grandparent.render();
    }
    this.move_up = function(){
	var node = this.curr_node;
	var parent = this.collections.get(node.parent, 'outline');
	var siblings = parent.visible_children();
	var curr_index = _.indexOf(siblings, node.id);
	if (curr_index == 0){
	    return null;
	}else{
	    parent.remove_child(node);
	    parent.add_child(node, curr_index - 1);
	}
	parent.render();
	node.shade();
    }
    this.move_down = function(){
	var node = this.curr_node;
	var parent = this.collections.get(node.parent, 'outline');
	var siblings = parent.visible_children();
	var curr_index = _.indexOf(siblings, node.id);
	if (curr_index >= siblings.length - 1){
	    return null;
	}else{
	    parent.remove_child(node);
	    parent.add_child(node, curr_index + 1);
	}
	parent.render();
	node.shade();
    }
    this.search_fade_out = function(){
	var timestamp = storage.timestamp();
	if (timestamp - this.search_active_timestamp >= FADEOUT_DELAY){
	    console.log('fading out');
	    $('#searchbox').fadeOut(300);
	}
    }
    this.search_fade_in = function(){
	if (!$('#searchbox').is(':visible')){
	    $('#searchbox').fadeIn(300);
	    this.search_active_timestamp = storage.timestamp();
	    window.setTimeout(function(){
		obj.search_fade_out.call(obj);
	    }, FADEOUT_DELAY);
	}
    }
    this.isearch_strings = function(target, text){
	if (target.toLowerCase() == target){
	    return [target.toLowerCase(), text.toLowerCase()];
	}else{
	    return [target, text];
	}
    }
    this.isearch_down = function(){
	if (!this.curr_node){
	    this.cursor_down();
	}
	this.search_fade_in();
	var new_idx;
	var val = $('#searchtext').val();
	var curr_point = this.curr_node.field_el('text')[0].selectionEnd;
	var curr_text;
	var temp;
	var try_select_text = function (node, curr_point){
	    temp = obj.isearch_strings(val, node.get('text'));
	    val = temp[0];
	    curr_txt = temp[1];
	    console.log(['searching', val, curr_txt]);
	    new_idx = curr_txt.indexOf(val, curr_point);
	    if (new_idx >= 0){
		node.select()
		node.field_el('text')[0].setSelectionRange(
		    new_idx, new_idx + val.length);
		return true;
	    }else{
		return false;
	    }
	}
	var success = try_select_text(this.curr_node, curr_point);
	if(!success){
	    var node_iter = this.curr_node;
	    while(true){
		node_iter = this.find_lower_visible_node(node_iter);
		if (!node_iter){
		    break
		}else{
		    success = try_select_text(node_iter, 0);
		    if (success){
			break;
		    }
		}
	    }
	}
    }

    this.isearch_down.noselect = true;

    this.isearch_up = function(){
	//should refactor this to share with isearch_down
	if (!this.curr_node){
	    this.cursor_down();
	}
	this.search_fade_in();
	var new_idx;
	var val = $('#searchtext').val();
	var curr_point = this.curr_node.field_el('text')[0].selectionStart - 1;
	var curr_text;
	var temp;
	var try_select_text = function (node, curr_point){
	    if (curr_point < 0){
		return false;
	    }
	    temp = obj.isearch_strings(val, node.get('text'));
	    val = temp[0];
	    curr_txt = temp[1];
	    console.log(['searching', val, curr_txt]);
	    new_idx = curr_txt.lastIndexOf(val, curr_point);
	    if (new_idx >= 0){
		node.select()
		node.field_el('text')[0].setSelectionRange(
		    new_idx, new_idx + val.length);
		return true;
	    }else{
		return false;
	    }
	}
	var success = try_select_text(this.curr_node, curr_point);
	if(!success){
	    var node_iter = this.curr_node;
	    while(true){
		node_iter = this.find_upper_node(node_iter);
		console.log(['searching', node_iter.get('text')]);
		if (!node_iter){
		    break
		}else{
		    success = try_select_text(node_iter, node_iter.get('text').length);
		    if (success){
			break;
		    }
		}
	    }
	}
	
    }
    this.isearch_up.noselect = true;

    this.focus_isearch = function(){
	$('#searchbox').fadeIn(300);
	console.log('focus isearch');
	$('#searchtext').focus();
    }
    this.focus_isearch.noselect = true;
    $('#searchtext').blur(function(){
	$('#searchbox').fadeOut(300);
    });
    this.keyfunctions = {
	'cursor_up' : this.cursor_up,
	'cursor_down' : this.cursor_down,
	'move_up':this.move_up,
	'move_down':this.move_down,
	'move_left':this.move_left,
	'move_right':this.move_right,
	'delete':this.deletenode,
	'toggle_outline': function(){
	    if (this.curr_node){
		this.curr_node.toggle_outline_state();
		this.curr_node.show_outline_state();
	    }
	},
	'toggle_all_outline':function(){
	    if (this.curr_node){
		this.root_node.toggle_child_outline_state();
	    }
	},
	'toggle_todo': function(){
	    if (this.curr_node){
		this.curr_node.toggle_todo_state();
	    }
	},
	'isearch_up': this.isearch_up,
	'isearch_down':this.isearch_down,
    	'focus_isearch': this.focus_isearch
    }
    $('#searchbox').hide();
}

