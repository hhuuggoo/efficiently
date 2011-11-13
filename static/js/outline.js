var ENTER = 13;
var BACKSPACE = 8;
var outline = {}
window.todostates = ["TODO", "INPROGRESS", "DONE", null];
window.todocolors  = {'TODO' : 'red',
		      'INPROGRESS': 'red',
		      'DONE' : 'green'}
window.outlinetitle = "Main";

//outline_state, 0, show everything, 
outline.Outline = function(id, outlinetitle){
    this.set('id', id); 
    this.set('text', '');
    this.set('todostate', null);
    this.set('date', null);
    this.set('parent', null);
    this.set('children', []);
    this.set('outlinetitle', outlinetitle);
    this.set('status', 'ACTIVE');
    this.dirty = {};
    this.el = null;
    this.outline_state = 0;
}

//data model
outline.Outline.prototype = new model.Model()
outline.Outline.prototype.fields = ['username', 'id', 'text', 'todostate', 
				    'date', 'children', 'parent', 'outlinetitle',
				   'status']
outline.Outline.prototype.save = function(){
    collections.save(this.id, this, 'outline');
}

outline.Outline.prototype.add_child = function(child, index){
    var children = this.get('children')
    if (index==null){
	children.push(child.id)
    }else{
	children.splice(index, 0, child.id);
    }
    this.set('children', children);
    child.set('parent', this.id);
    child.set('status', 'ACTIVE');
    this.save()
    child.save()
}

outline.Outline.prototype.remove_child = function(child){
    var children = this.get('children')
    children = _.filter(children, function(x){return x != child.id});
    this.set('children', children);
    this.save()
}
outline.Outline.prototype.tree_apply = function(func, level){
    func(this);
    if (level>0 || level==null){
	var new_level = (level == null) ? null : level - 1;
	var children = this.get('children')
	_.each(children, function(x){
	    var child = collections.get(x, 'outline');
	    child.tree_apply(func, new_level);
	});
    }
}
outline.Outline.prototype.tree_apply_children_first = function(func, level){
    if (level>0 || level==null){
	var new_level = (level == null) ? null : level - 1;
	var children = this.get('children')
	_.each(children, function(x){
	    var child = collections.get(x, 'outline');
	    child.tree_apply(func, new_level);
	});
    }
    func(this);
}
//view
outline.Outline.prototype.render_hidden = function(){
    var visible_children = this.visible_children();
    var children = this.get('children')
    if (children.length > visible_children.length){
	this.field_el('hideindicator').html("+");
    }else{
	this.field_el('hideindicator').html("");
    }
}
outline.Outline.prototype.tree_search = function(txt){
    //searches but also returns
    this.show_all_descendants();
    var f = function (x) {
	var matched = false;
	var children_matched = _.map(x.get('children'), function(cid){
	    return f(collections.get(cid, 'outline'));
	})
	if (_.includes(x.get('text'), txt) || x.get('todostate') == txt){
	    matched = true;
	}
	if (!_.any(children_matched) && !matched){
	    x.el.hide();
	    return false;
	}else{
	    return true;
	}
	this.render_hidden();
    }
    f(this);
}

outline.Outline.prototype.visible_children = function(){
    if (this.get('child_hidden')){
	return []
    }else{
	var children = this.get('children')
	children = _.filter(children,
			    function(x){
				return !collections.get(x, 'outline').get('hidden')
			    });
	return children
    }
}
outline.Outline.prototype.select = function(){
    this.shade();
    this.field_el('text').focus();
}
outline.Outline.prototype.unselect = function(){
    this.unshade()
    this.field_el('text').blur();
}

outline.Outline.prototype.shade = function(){
    this.field_el('content').addClass('shade');
}
outline.Outline.prototype.unshade = function(){
    this.field_el('content').removeClass('shade');
}
outline.Outline.prototype.show_children = function(){
    if (this.get('children').length > 0){
	this.field_el('childcontainer').show();
    }else{
	this.field_el('childcontainer').hide();
    }
    _.each(this.get('children'), function(x){
	var child = collections.get(x, 'outline');
	child.el.show();
    });
    this.render_hidden();
}
outline.Outline.prototype.hide_children = function(){
    this.field_el('childcontainer').hide();
    this.render_hidden();
}

outline.Outline.prototype._child_hidden_getter = function(){
    return !this.field_el('childcontainer').is(":visible");
}
outline.Outline.prototype._hidden_getter = function(){
    return !this.el.is(":visible");
}
outline.Outline.prototype.show_all_descendants = function(){
    this.el.show();
    this.tree_apply(function(x){
	x.show_children();
    }, null);
}

outline.Outline.prototype.show_all_children = function(){
    this.tree_apply(function(x){
	x.hide_children();
    }, 1);
    this.show_children();
}
outline.Outline.prototype.toggle_todo_state = function(){
    var currstate = this.get('todostate', null);	
    var curridx = _.indexOf(window.todostates, currstate);
    if (curridx < 0 || curridx >= window.todostates.length-1){
	curridx = 0;
    }else{
	curridx = curridx + 1;
    }
    this.set('todostate', window.todostates[curridx]);
    this.save();
    this.render();
}

outline.Outline.prototype.toggle_outline_state = function(){
    var curr_state = this.outline_state
    if (curr_state < 0 || curr_state >=2){
	curr_state = 0
    }else{
	curr_state = curr_state + 1;
    }
    this.outline_state = curr_state;
    return this.outline_state;
}
outline.Outline.prototype.show_outline_state = function(){
    if (this.outline_state == 0){
	this.show_all_descendants()
    }else if (this.outline_state == 1){
	this.hide_children();
    }else if (this.outline_state == 2){
	this.show_all_children();
    }
}
outline.Outline.prototype.toggle_child_outline_state = function(){
    var curr_state = this.toggle_outline_state();
    _.each(this.get('children'), function(x){
	var child = collections.get(x, 'outline')
	child.outline_state = curr_state
    });
    _.each(this.get('children'), function(x){
	var child = collections.get(x, 'outline')
	child.show_outline_state();
    });
    
}
outline.Outline.prototype.template = _.template($('#outline-template').html())
roottemplate = _.template($('#root-template').html())
outline.Outline.prototype.field_id = function(fld){
    if (!fld){
	return this.get('id');
    }else{
	return this.get('id') + "-" + fld;
    }
}
outline.Outline.prototype.field_el = function(fld){
    if (!fld){
	return this.el;
    }else{
	return $("#" + this.field_id(fld), this.el);
    }
}

outline.Outline.prototype.render_field = function(field){
    $("#" + this.field_id(field), this.el).html(this.get(field));
}

outline.Outline.prototype.render_text = function(){
    var node = this.field_el('text')
    node.val(this.get('text'));
    var obj = this;
    window.setTimeout(function(){
	node.resizeNow.call(node);}, 100);

}
outline.Outline.prototype.render_todostate = function(){
    var currstate = this.get('todostate');

    	
    this.field_el('todostate').html(currstate);
    if (currstate in window.todocolors){
	this.field_el('todostate').css('color', window.todocolors[currstate]);
    }else{
	this.field_el('todostate').css('color', 'black');
    }
    //adjust width of text to match size;
    var obj = this;
    window.setTimeout(
	function(){
	    obj.set_text_width();
	}, 100);

}
outline.Outline.prototype.render_children = function(){
    var ids = this.get('children');
    var obj = this;
    this.field_el('children').children().detach();
    if (ids.length == 0){
	obj.field_el('childcontainer').hide();
    }else{
	obj.field_el('childcontainer').show();
	_.each(ids, function(id){
	    var child = collections.get(id, 'outline');
	    child.render();
	    obj.field_el('children').append(child.el);
	});
    }
    _.each(ids, function(id){
	var child = collections.get(id, 'outline');
	window.setTimeout(
	    function(){
		child.set_text_width();
	    }, 100)
    });

}
outline.Outline.prototype.render_function = function(field){
    var obj = this;
    if ("render_"  + field in this){
	return function(){obj["render_"  + field]()};
    }else{
	return function() {obj.render_field(field);};
    }
}
var deletenode = function(obj){
    var f  = function(target){
	var parent = collections.get(target.parent, 'outline')
	if (parent){
	    parent.remove_child(target);
	    parent.render();
	}
	if (target.get('status') == 'ACTIVE'){
	    totrash(target)
	}else{
	    todelete(target)
	}
    }
    obj.tree_apply_children_first(f);
}
var totrash = function(obj){
    obj.set('status', 'TRASH')
    obj.save()
    $('#trash').append(obj.el)
}

var todelete = function(obj){
    obj.set('status', 'DELETE')
    obj.save()
    obj.el.remove();
    collections.remove(obj.id, 'outline');
}

var addsibling = function(obj){
    var newnode = new outline.Outline(collections.new_id(),
				     window.outlinetitle);
    var parent = collections.get(obj.parent, 'outline')
    var curr_index = _.indexOf(parent.get('children'), obj.get('id'))
    parent.add_child(newnode, curr_index + 1);
    parent.render();
    newnode.field_el('text').delay(300).focus();
}
var add_new_child = function(obj, index){
    var newnode = new outline.Outline(collections.new_id(),
				     window.outlinetitle);
    obj.add_child(newnode, index);
    obj.render();
    newnode.field_el('text').delay(300).focus();
}

outline.Outline.prototype.hook_events = function(){
    var obj = this;
    var savetext = function(){
	var newval = obj.field_el('text').val();
	if (newval != obj.get('text')){
	    obj.set('text', newval);
	    obj.save();
	}
    }
    this.field_el('content').droppable(
        {'tolerance':'pointer',
	 'hoverClass': "ui-state-hover",
	 'drop': function(e, ui){
	     var dropping_id = ui.draggable.data()['id'];
	     var droppingnode = collections.get(dropping_id, 'outline');
	     var droppingparent = collections.get(droppingnode.parent, 'outline');
	     droppingparent.remove_child(droppingnode);
	     obj.add_child(droppingnode, 0);
	     droppingparent.render();
	     obj.render();
	     ui.draggable.css(
		 {'top' : 0 + "px", 'left' : 0 + "px"}
	     );
	 }
	}
    );
    this.field_el('bottomedge').droppable(
	{'tolerance':'pointer',
	 'hoverClass': "ui-state-hover",
	 'drop': function(e, ui){
	     var currentparent = collections.get(obj.get('parent'), 'outline');
	     var currentsiblings = currentparent.get('children');
	     var currentindex = _.indexOf(currentsiblings, obj.id);
	     var newindex = currentindex + 1;
	     var dropping_id = ui.draggable.data()['id'];
	     var droppingnode = collections.get(dropping_id, 'outline');
	     var droppingparent = collections.get(droppingnode.parent, 'outline');
	     droppingparent.remove_child(droppingnode);
	     currentparent.add_child(droppingnode, newindex);
	     droppingparent.render();
	     currentparent.render();
	     ui.draggable.css(
		 {'top' : 0 + "px", 'left' : 0 + "px"}
	     );

	 }
	}
    );
    this.field_el('text').focus(function(e){
	window.item_selector.curr_node = obj;
	obj.shade();
    });
    this.field_el('text').blur(function(e){
	savetext(e);
	obj.unshade();
    });
    this.field_el('text').keydown(function(e){
	if (e.keyCode == ENTER && !e.ctrlKey){
	    obj.field_el('text').blur();
	    var newval = obj.field_el('text').val();
	    if (!newval && obj.get('children').length == 0){
	    }else{
		addsibling(obj);
	    }
	    return false;
	}else if (e.keyCode == ENTER && e.ctrlKey){
	    add_new_child(obj, 0);
	    return false;
	}else if (e.keyCode == BACKSPACE && !e.ctrlKey){
	    var newval = obj.field_el('text').val();
	    if (!newval && obj.get('children').length == 0
		&& obj.last_backspace_txt==newval){
		obj.field_el('text').blur();
		deletenode(obj);
		return false;
	    }
	    obj.last_backspace_txt = newval;
	}
    });
    this.field_el('content').draggable({'revert':'invalid',
					'stack': '*',
				       });
    this.field_el('content').data({'id':this.id});
    this.field_el('fakedotcontainer').dblclick(
	function(e){
	    toggle_controls(e, obj);
	}
    );
}


var toggle_controls = function(e, obj){
    var activator = obj.field_el('fakedotcontainer');
    var show = function(e){
	obj.select();
	window.activeobj = obj;
	window.controls.show()
	var x = e.pageX;
	var y = e.pageY;
	x = x - 60;
	y = y - 10;
	x = x<0 ? 0 : x;
	y = y<0 ? 0 : y;
	window.controls.css(
	    {'top' : y + "px", 'left' : x + "px"}
	);
	var border = 10;
	var x3 = activator.offset().left;
	var x4 = x3 + activator.width();
	var y3 = activator.offset().top;
	var y4 = y3 + activator.height();

	var x1 = window.controls.offset().left;
	var x2 = x1 + window.controls.width();
	var y1 = window.controls.offset().top;
	var y2 = y1 + window.controls.height();
	x3=x3-border; x4=x4+border; y3=y3-border; y4=y4+border;
	x1=x1-border; x2=x2+border; y1=y1-border; y2=y2+border;
	function callback(e){
	    if (!((e.pageX >= x1 && e.pageX <= x2 && e.pageY >= y1 && e.pageY <= y2) ||
		  (e.pageX >= x3 && e.pageX <= x4 && e.pageY >= y3 && e.pageY <= y4))
	       ){
		toggle_controls(e, obj);
	    }
	}
	$(document).bind('click', callback);
    }
    var hide = function(e){
	window.controls.hide();
	$(document).unbind('click');
	window.activeobj = null;
    }
    if (window.activeobj != obj){
	show(e);
    }else{
	!window.controls.is(":visible") ? show(e) : hide(e);
    }

}

outline.Outline.prototype.set_text_width = function(){
    // var w1 = this.field_el('todostate').width();
    // var w2 = this.field_el('content').width()
    // var w3 = 13; //fakedotcontainer
    // var error = 20;
    // //console.log([w1,w2,w3]);
    // //console.log(factor * (w2-w1-w3));
    // this.field_el('text').width((w2-w1-w3)-error);
    // this.field_el('children').width((w2-w3)-error);
}

outline.Outline.prototype.render = function(isroot){
    if (!this.el){
	if (!isroot){
	    this.el = $(this.template(this.to_dict()));
	    this.hook_events()
	}else{
	    this.el = $(roottemplate(this.to_dict()));
	    this.hook_events()
	}
	this.field_el('text').autoResize();
	this.field_el('childcontainer').hide();
    }
    var obj = this;
    _.each(this.fields, function(f){
	if (obj.dirty[f]){
	    obj.render_function(f).call(obj);
	    delete obj.dirty[f];
	}
    });
}

$(function(){
    collections = new storage.Collections('id5', {'outline' : outline.Outline});
    controls = $('.item-controls');
    controls.hide();
    activeobj = null;
    $('#add-button').click(
	function(e){
	    add_new_child(activeobj);
	}
    );
    $('#root-add').click(function(){
	var root = collections.get(root_id, 'outline');
	var newitem = new outline.Outline(collections.new_id(),
					  window.outlinetitle);
	root.add_child(newitem);
	root.save();
	root.render();
    });

    $('#state-button').click(
	function(e){
	    activeobj.toggle_todo_state();
	}
    );

    $('#overview-button').click(
	function(e){
	    activeobj.toggle_outline_state();
	    activeobj.show_outline_state();
	}
    );
    $('#del-button').click(
	function(e){
	    deletenode(activeobj);
	    toggle_controls(e, activeobj);
	    activeobj=null;
	}
    );
    $('#search').keypress(
	function(e){
	    if (e.keyCode == ENTER){
		e.stopPropagation();
		root.tree_search($('#search').val());
		e.preventDefault();
	    }
	}
    )
    window.controls = controls
    window.activeobj = activeobj

    $.get("/entries/Main", function(data){
	var entries = JSON.parse(data);
	_.each(entries, function(x){
	    var tmp = new outline.Outline();
	    tmp.deserialize(JSON.stringify(x));
	    collections.set_mem(x['id'], tmp, 'outline');
	});
	root_id = $("#main_root_id").html()
	root = collections.get(root_id, 'outline');
	if (!root){
	    // root = new outline.Outline(root_id,
	    // 			       window.outlinetitle);
	    // newitem = new outline.Outline(collections.new_id(),
	    // 				  window.outlinetitle);
	    // root.add_child(newitem);
	    // root.save()
	}
	root.render(true);
	$('#main-outline').append(root.el);
	window.item_selector = new ItemSelector(root, collections);
	_.each(collections.collections['outline'],
	       function(x){
		   if(x.get('status') == 'TRASH'){
		       x.render()
		       $('#trash').append(x.el)
		   }
	       });
	$('#root-clear-trash').click(function(e){
	    _.each(collections.collections['outline'],
		   function(x){
		       if(x.get('status') == 'TRASH'){
			   deletenode(x);
		       }
		   });
	});
	$('#debugbtn').click(function(e){
	    var node = get_matching_text('release')[0];
	    node.render_text();
	    var ht = node.field_el('text')[0].scrollHeight;
	    $('#debug').html(ht);
	});
    });
    
});

function get_matching_text(data){
    var output = []
    _.each(collections.collections['outline'],
	     function(v,k){
		 if (_.includes(v.get('text'), data)){
		     output.push(v)
		 }
	     }
	  );
    return output
}