var UP = 38;
var DOWN = 40;
ItemSelector = function(root_node, collections){
    var obj = this;
    this.collections = collections
    this.root_node = root_node;
    this.curr_node = null;
    this.curr_idx = 0;
    this.keyhandle = function(e){
	console.log('keypress');
        if (e.keyCode == UP){
            this.cursor_up();
        }else if (e.keyCode == DOWN){
            this.cursor_down();
        }else if (!e.ctrlKey && e.keyCode == UP){
            this.move_up();
        }else if (!e.ctrlKey && e.keyCode == DOWN){
            this.move_down();
	}
    }
    $(document).keyup(function(e){
	console.log(obj);
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
}

