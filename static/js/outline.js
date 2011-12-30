//operations
//cut paste subtopic, paste above, paste below
//delete hide todo new
//for mobile version, separate focus of node from focus of textarea, only focus
//textarea on click.  display control panel at the bottom constantly.


var outline = {}
//outline_state, 0, show everything,

outline.Outline = function(id, documentid){
    this.set('id', id);
    this.set('documentid', documentid);
    this.set('text', '');
    this.set('date', null);
    this.set('parent', null);
    this.set('children', []);
    this.set('status', 'ACTIVE');
    this.dirty = {};
    this.el = null;
    this.outline_state = 0;
}

//data model
outline.Outline.prototype = new model.Model()
outline.Outline.prototype.fields = ['documentid', 'username', 'id', 
				    'text',  
				    'date', 'children', 'parent',
				    'status']
outline.Outline.prototype.save = function(){
    window.collections.save(this.id, this, 'outline');
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
    child.set('parent', null);
    child.save();
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
	    var child = window.collections.get(x, 'outline');
	    child.tree_apply(func, new_level);
	});
    }
}
outline.Outline.prototype.tree_apply_children_first = function(func, level){
    if (level>0 || level==null){
	var new_level = (level == null) ? null : level - 1;
	var children = this.get('children')
	_.each(children, function(x){
	    var child = window.collections.get(x, 'outline');
	    child.tree_apply(func, new_level);
	});
    }
    func(this);
}

//
//view
//render
outline.Outline.prototype.render_text = function(){
    if (this.field_el('textarea').is(":visible")){
	this.render_textarea();
    }else{
	this.render_textdisplay();
    }
}

outline.Outline.prototype.render_textdisplay = function(){
    this.field_el('textarea').hide()
    this.field_el('textdisplay').show()
    var node = this.field_el('textdisplay')
    var doc = window.collections.get(this.get('documentid'), 'document');
    node.html(
	doc.color(this.get('text'))
    );
    var words = _.words(this.get('text'));
}
outline.Outline.prototype.render_textarea = function(){
    var node = this.field_el('textarea')
    node.val(this.get('text'));	
    var obj = this;
    this.field_el('textarea').show()
    this.field_el('textdisplay').hide()
    window.setTimeout(function(){
	node.resizeNow.call(node);}, 100);
}

// outline.Outline.prototype.render_todostate = function(){
//     var currstate = this.get('todostate');
//     var todocolors = window.collections.get(this.documentid, 'document').get('todocolors');
//     this.field_el('todostate').html(currstate);
//     if (currstate in todocolors){
// 	this.field_el('todostate').css('color', todocolors[currstate]);
//     }else{
// 	this.field_el('todostate').css('color', 'black');
//     }
//     //adjust width of text to match size;
//     var obj = this;

// }

outline.Outline.prototype.render_children = function(){
    var ids = this.get('children');
    var obj = this;
    this.field_el('children').children().detach();
    if (ids.length == 0){
	obj.field_el('childcontainer').hide();
    }else{
	obj.field_el('childcontainer').show();
	_.each(ids, function(id){
	    var child = window.collections.get(id, 'outline');
	    child.render();
	    obj.field_el('children').append(child.el);
	});
    }
}

outline.Outline.prototype.render_hidden = function(){
    var visible_children = this.visible_children();
    var children = this.get('children')
    if (children.length > visible_children.length){
	this.field_el('hideindicator').html("+");
    }else{
	this.field_el('hideindicator').html("");
    }
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
	this.field_el('textarea').autoResize();
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
outline.Outline.prototype.toggle_todo_state = function(){
    var document = collections.get(this.get('documentid'), 'document')
    var newtext = document.transition_todo(this.get('text'))
    console.log(newtext);
    this.set('text', newtext);
    this.render();
    this.save();
}

//view operations
outline.Outline.prototype.shade = function(){
    this.field_el('content').addClass('shade');
}
outline.Outline.prototype.unshade = function(){
    this.field_el('content').removeClass('shade');
}

//view properties
outline.Outline.prototype._child_hidden_getter = function(){
    return !this.field_el('childcontainer').is(":visible");
}
outline.Outline.prototype._hidden_getter = function(){
    return !this.el.is(":visible");
}

outline.Outline.prototype.visible_children = function(){
    if (this.get('child_hidden')){
	return []
    }else{
	var children = this.get('children')
	children = _.filter(children,
			    function(x){
				return !window.collections.get(x, 'outline').get('hidden')
			    });
	return children
    }
}

//view tree operations
outline.Outline.prototype.tree_search = function(txt){
    //searches but also returns
    this.show_all_descendants();
    var tagsearch = _.includes(txt, '#') || _.includes(txt, '@') || _.include(window.active_doc.get('todostates'), txt);
    var f = function (x) {
	var matched = false;
	if (_.includes(x.get('text'), txt)){
	    matched = true;
	    if (tagsearch){
		return true;
	    }
	}
	var children_matched = _.map(x.get('children'), function(cid){
	    return f(window.collections.get(cid, 'outline'));
	})
	if (!_.any(children_matched) && !matched){
	    x.el.hide();
	    return false;
	}else{
	    x.render_hidden();
	    return true;
	}
	
    }
    f(this);
}


outline.Outline.prototype.show_children = function(){
    if (this.get('children').length > 0){
	this.field_el('childcontainer').show();
    }else{
	this.field_el('childcontainer').hide();
    }
    _.each(this.get('children'), function(x){
	var child = window.collections.get(x, 'outline');
	child.el.show();
    });
    this.render_hidden();
}
outline.Outline.prototype.hide_children = function(){
    this.field_el('childcontainer').hide();
    this.render_hidden();
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
	var child = window.collections.get(x, 'outline')
	child.outline_state = curr_state
    });
    _.each(this.get('children'), function(x){
	var child = window.collections.get(x, 'outline')
	child.show_outline_state();
    });
    
}

outline.Outline.prototype.template = _.template($('#outline-template').html())
roottemplate = _.template($('#root-template').html())


var deletenode = function(obj){
    var f  = function(target){
	var parent = window.collections.get(target.parent, 'outline')
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
    window.collections.remove(obj.id, 'outline');
}

var addsibling = function(obj){
    var newnode = new outline.Outline(window.collections.new_id(),
				      obj.get('documentid'));
    var parent = window.collections.get(obj.parent, 'outline')
    var curr_index = _.indexOf(parent.get('children'), obj.get('id'))
    parent.add_child(newnode, curr_index + 1);
    parent.render();
    window.item_selector.select(newnode);
}
var add_new_child = function(obj, index){
    var newnode = new outline.Outline(window.collections.new_id(),
				      obj.get('documentid'))
    obj.add_child(newnode, index);
    obj.render();
    window.item_selector.select(newnode);
}

outline.Outline.prototype.savetext = function(){
    if (!this.field_el('textarea').is(":visible")){
	return
    }
    var newval = this.field_el('textarea').val();
    if (newval != this.get('text')){
	this.set('text', newval);
	this.save();
    }
}
//event handling
outline.Outline.prototype.hook_events = function(){
    var obj = this;
    this.field_el('content').droppable(
        {'tolerance':'pointer',
	 'hoverClass': "ui-state-hover",
	 'drop': function(e, ui){
	     var dropping_id = ui.draggable.data()['id'];
	     var droppingnode = window.collections.get(dropping_id, 'outline');
	     var droppingparent = window.collections.get(droppingnode.parent, 'outline');
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
	     var currentparent = window.collections.get(obj.get('parent'), 'outline');
	     var currentsiblings = currentparent.get('children');
	     var currentindex = _.indexOf(currentsiblings, obj.id);
	     var newindex = currentindex + 1;
	     var dropping_id = ui.draggable.data()['id'];
	     var droppingnode = window.collections.get(dropping_id, 'outline');
	     var droppingparent = window.collections.get(droppingnode.parent, 'outline');
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
    this.field_el('text').click(function(e){
	window.item_selector.select(obj);
    });
    this.field_el('textarea').focus(function(e){
	window.item_selector._select(obj);
    });

    this.field_el('textarea').blur(function(e){
	window.item_selector._unselect(obj);	
    });

    this.field_el('textarea').keydown(function(e){
	if (e.keyCode == ENTER && !window.modified(e)){
	    obj.field_el('textarea').blur();
	    var newval = obj.field_el('textarea').val();
	    if (!newval && obj.get('children').length == 0){
	    }else{
		addsibling(obj);
	    }
	    return false;
	}else if (e.keyCode == ENTER && window.modified(e)){
	    add_new_child(obj, 0);
	    return false;
	}else if (e.keyCode == BACKSPACE && !window.modified(e)){
	    var newval = obj.field_el('textarea').val();
	    if (!newval && obj.get('children').length == 0
		&& obj.last_backspace_txt==newval){
		obj.field_el('textarea').blur();
		deletenode(obj);
		return false;
	    }
	    obj.last_backspace_txt = newval;
	}
    });
    this.field_el('content').draggable({
	'revert':'invalid',
	'stack': '*',
	'helper': function(){
	    var node =  $(obj.field_el('content')).clone();
	    $('textarea', node).val(obj.get('text'));
	    node.css({'background' : 'silver', 
		      'width' : obj.field_el('content').width() + "px"})
	    return node;
	}
    });
    this.field_el('content').data({'id':this.id});
    this.field_el('fakedotcontainer').dblclick(
	function(e){
	    toggle_controls(e, obj);
	}
    )
}

outline.Document = function(){
    this.set('title', '');
    this.set('root_id', null);
    this.set('username', null);
    this.set('todostates', ["TODO", "INPROGRESS", "DONE"]);
    this.set('todocolors', {'TODO' : 'red',
			    'INPROGRESS': 'red',
			    'DONE' : 'green'})
    this.set('status', 'ACTIVE');
}

//data model
outline.Document.prototype = new model.Model()
outline.Document.prototype.fields = ['id', 'title', 'root_id', 'username', 
				    'todostates', 'todocolors', 'status'];
outline.Document.prototype.save = function(){
    window.collections.save(this.id, this, 'document');
}

outline.Document.prototype.make_state_regex_map = function(states){
    var state_regex_map = {}
    var r
    if (!('state_regex_map' in this)){
	_.each(states, function(state){
	    r = new RegExp(_.sprintf("(^%s)", state));
	    state_regex_map[state] = r;
	});
	this.state_regex_map = state_regex_map;
    }
}
outline.Document.prototype._todostates_setter = function(states){
    var that = this;
    this.todostates = states;
    this.make_state_regex_map(states);
    var transition_function_map = {};
    _.each(states, 
	   function(state, index){
	       if (index == states.length - 1){
		   transition_function_map[state] = function(txt){
		       txt = txt.replace(that.state_regex_map[state], '');
		       return txt;
		   }
	       } else{
		   transition_function_map[state] = function(txt){
		       txt = txt.replace(that.state_regex_map[state], 
					 states[index + 1]);
		       return txt;
		   }
	       }
	   });
    transition_function_map[''] = function(txt){
	if (_.startsWith(txt, ' ')){
	    txt = states[0] + txt;
	}else{
	    txt = states[0] + " " + txt;
	}
	return txt;
    }
    this.transition_function_map = transition_function_map;
}

outline.Document.prototype._todocolors_setter = function(val){
    var that = this;
    this.make_state_regex_map(_.keys(val));
    var color_function_map = {};
    _.each(val, 
	   function(color, state){
	       color_function_map[state] = function(txt){
		   r = that.state_regex_map[state];
		   txt = txt.replace(
		       r, 
		       _.sprintf("<span style='color:%s'>$1</span>", color));
		   return txt
	       }
	   });
    color_function_map[''] = function(x){return x};
    this.color_function_map = color_function_map;
    this.todocolors = val;
}
outline.Document.prototype.parse_todostate = function(txt){
    var todostates = this.get('todostates')
    var currstate = _.filter(todostates, function(x){
	//have to include x in there, so because every string matches startswith
	//and null
	return x && _.startsWith(txt, x)
    });
    if (currstate.length == 0){
	currstate = ''
    }else{
	currstate = currstate[0];
    }
    return currstate;
}
outline.Document.prototype.transition_todo = function(txt){
    var currstate = this.parse_todostate(txt);
    txt = this.transition_function_map[currstate](txt);
    return txt;
}
outline.Document.prototype.color_todostate = function(txt){
    var currstate = this.parse_todostate(txt);
    txt = this.color_function_map[currstate](txt);
    return txt;
}
outline.Document.prototype.color = function(txt){
    return this.color_todostate(
	outline.color_hashtags(
	    outline.color_atpeople(txt)));
}

//globals
window.active_obj = null;
window.item_selector = null;
window.controls = null;
window.collections = null;
window.active_doc = null;

var toggle_controls = function(e, obj){
    var activator = obj.field_el('fakedotcontainer');
    var show = function(e){
	window.item_selector.select(obj);
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
	console.log({'top' : y + "px", 'left' : x + "px"});
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

var global_event_hooks = function(){
    $('#add-button').click(
	function(e){
	    add_new_child(window.activeobj);
	}
    );

    $('#state-button').click(
	function(e){
	    window.activeobj.toggle_todo_state();
	}
    );

    $('#overview-button').click(
	function(e){
	    window.activeobj.toggle_outline_state();
	    window.activeobj.show_outline_state();
	}
    );
    $('#del-button').click(
	function(e){
	    deletenode(window.activeobj);
	    toggle_controls(e, window.activeobj);
	    window.activeobj=null;
	}
    );
    $('#global-clear-trash').click(function(e){
	_.each(window.collections.collections['outline'],
	       function(x){
		   if(x.get('status') == 'TRASH'){
		       deletenode(x);
		   }
	       });
    });
    $('#debugbtn').click(function(e){
	var node = get_matching_text('release')[0];
	node.render_text();
	var ht = node.field_el('textarea')[0].scrollHeight;
	$('#debug').html(ht);
    });
}

$(function(){
    var doc_id = $("#document_id").html()
    var root_id = $("#root_id").html()    
    var mode = $('#mode').html()
    var client_id = $('#client_id').html()
    window.collections = new storage.Collections(
	client_id, 
	{'outline' : outline.Outline, 
	 'document' : outline.Document}
    );
    window.controls = $('.item-controls');
    window.controls.hide();
    window.activeobj = null;
    
    $.get("/document/" + doc_id, function(data){
	//we have some redundant deserialization/serializations that occur
	var document = JSON.parse(data);
	var outlines = document['outline'];
	var document = document['document'];
	var tmp = new outline.Document()
	tmp.update(document);
	window.active_doc = tmp;
	if (mode == 'rw'){
	    tmp.set('saveurl', "/bulk/" + tmp.get('id'))
	}else{
	    tmp.set('saveurl', '')
	}
	window.collections.set_mem(tmp['id'], tmp, 'document');
	_.each(outlines, function(x){
	    tmp = new outline.Outline();
	    tmp.update(x);
	    window.collections.set_mem(x['id'], tmp, 'outline');
	});
	var root = window.collections.get(window.active_doc.root_id, 'outline');
	root.render(true);
	window.active_doc.field_el('outline').append(root.el);
	window.item_selector = new ItemSelector(root, window.collections);
	_.each(window.collections.collections['outline'],
	       function(x){
		   if(x.get('status') == 'TRASH'){
		       x.render()
		       $('#trash').append(x.el)
		   }
	       });
	window.active_doc.field_el('add').click(function(){
	    var root = window.collections.get(window.active_doc.root_id, 'outline');
	    add_new_child(root)
	});
	window.active_doc.field_el('search').keypress(
	    function(e){
		if (e.keyCode == ENTER){
		    e.stopPropagation();
		    var root = window.collections.get(window.active_doc.root_id, 'outline');
		    var txt = window.active_doc.field_el('search').val();
		    root.tree_search(txt);
		    e.preventDefault();
		}
	    });
	global_event_hooks();
	window.register_sockets();
	window.item_selector.cursor_down();
	//window.item_selector.select(curr_node);
    });
});

//debug function
function get_matching_text(data){
    var output = []
    _.each(window.collections.collections['outline'],
	     function(v,k){
		 if (_.includes(v.get('text'), data)){
		     output.push(v)
		 }
	     }
	  );
    return output
}

outline.color_hashtags = function(txt){
    txt = txt.replace(/(^|\s)#(\w+)/g, "$1<span class='hashtag'>#$2</span>");
    return txt
}
outline.color_atpeople = function(txt){
    txt = txt.replace(/(^|\s)@(\w+)/g, "$1<span class='hashtag'>@$2</span>");
    return txt
}
