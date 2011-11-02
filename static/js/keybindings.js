var UP = 38;
var DOWN = 40;
var LEFT = 37;
var RIGHT = 39;
var TAB = 9;

ItemSelector = function(root_node, collections){
    var obj = this;
    this.collections = collections
    this.root_node = root_node;
    this.curr_node = null;
    this.curr_idx = 0;
    this.keyhandle = function(e){
        if (!e.ctrlKey && e.keyCode == UP){
            this.cursor_up();
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
	}else if (e.keyCode == ENTER){
	    if (this.curr_node){
		this.curr_node.field_el('text').focus();
	    }
	}else if (e.ctrlKey && e.keyCode == BACKSPACE){
	    if (this.curr_node){
		var parent = this.collections.get(this.curr_node.parent, 'outline')
		var siblings = parent.get('children');
		var idx = _.indexOf(siblings, this.curr_node.id);
		var next_current = null;
		if (idx != 0){
		    next_current = this.collections.get(siblings[idx - 1], 'outline');
		}else if (idx < siblings.length - 1){
		    next_current = this.collections.get(siblings[idx + 1], 'outline');
		}else{
		    next_current = parent;
		}
		deletenode(this.curr_node);
		this.curr_node = next_current;
		this.curr_node.select();
	    }
	}else if (e.keyCode == TAB){
	    if (this.curr_node){
		this.curr_node.toggle_outline_state();
	    }
	}
    }
    $(document).keyup(function(e){
	obj.keyhandle(e);
    });
    this.cursor_up = function(){
	if (!this.curr_node){
	    this.curr_node = this.collections.get(
		root.get('children')[0], 'outline');
	    this.curr_node.select();
	}else{
	    this.curr_node.unselect();
	    var parent = this.collections.get(this.curr_node.parent,
					      'outline');
	    var siblings = parent.get('children');
	    var curr_idx = _.indexOf(siblings, this.curr_node.id);
	    if (curr_idx != 0){
		this.curr_node = this.collections.get(siblings[curr_idx - 1], 
						      'outline');
	    }else{
		this.curr_node = parent
		
	    }
	    this.curr_node.select()
	}
    };
    this.cursor_down = function(){
	if (!this.curr_node){
	    this.curr_node = this.collections.get(
		root.get('children')[0], 'outline');
	    this.curr_node.select();
	}else{
	    this.curr_node.unselect();
	    var next_node = this.find_lower_node(this.curr_node);
	    if (next_node){
		this.curr_node = next_node;
	    }
	    this.curr_node.select();
	}
    };
    this.lower_sibling = function(node){
	var parent = this.collections.get(node.parent, 'outline');
	if (!parent){
	    return null;
	}
	var siblings = parent.get('children');
	var curr_idx = _.indexOf(siblings, node.id);
	if (curr_idx < siblings.length - 1){
	    return this.collections.get(siblings[curr_idx + 1], 'outline');
	}else{
	    return null;
	}
    }
    this.find_lower_node = function(node){
	children = node.get('children')
	if (children.length > 0){
	    return this.collections.get(children[0], 'outline');
	}
	var node_iter = node;
	while (true){
	    var lower_sibling = this.lower_sibling(node_iter);
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
	var siblings = parent.get('children');

	children = node.get('children')
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
	var new_idx = _.indexOf(grandparent.get('children'),
				parent.id) + 1;
	
	parent.remove_child(node);
	grandparent.add_child(node, new_idx);
	parent.render();
	grandparent.render();
    }
    this.move_up = function(){
	var node = this.curr_node;
	var parent = this.collections.get(node.parent, 'outline');
	var siblings = parent.get('children');
	var curr_index = _.indexOf(siblings, node.id);
	if (curr_index == 0){
	    return null;
	}else{
	    parent.remove_child(node);
	    parent.add_child(node, curr_index - 1);
	}
	parent.render();
    }
    this.move_down = function(){
	var node = this.curr_node;
	var parent = this.collections.get(node.parent, 'outline');
	var siblings = parent.get('children');
	var curr_index = _.indexOf(siblings, node.id);
	if (curr_index >= siblings.length - 1){
	    return null;
	}else{
	    parent.remove_child(node);
	    parent.add_child(node, curr_index + 1);
	}
	parent.render();
    }
}

