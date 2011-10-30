var ENTER = 13;
var BACKSPACE = 8;
var outline = {}
outline.Outline = function(id){
    this.set('id', id);
    this.set('text', '');
    this.set('todostate', null);
    this.set('hidden', false);
    this.set('hide_state', 0);
    this.set('date', null);
    this.set('parent', null);
    this.set('children', []);
    this.dirty = {};
    this.el = null;
}
//data model
outline.Outline.prototype = new model.Model()
outline.Outline.prototype.fields = ['id', 'text', 'todostate', 'hidden',
				    'hide_state', 'date', 'children', 'parent']
outline.Outline.prototype.save = function(){
    collections.save(this.id, this, 'outline');
}
outline.Outline.prototype.add_child = function(child){
    var children = this.get('children')
    children.push(child.id)
    this.set('children', children);
    child.set('parent', this.id);
    this.save()
    child.save()
}
outline.Outline.prototype.remove_child = function(child){
    var children = this.get('children')
    children = _.filter(children, function(x){return x != child.id});
    this.set('children', children);
    this.save()
}


//view
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
    node.ready(function(){node.resizeNow.call(node);});
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
}
outline.Outline.prototype.render_function = function(field){
    var obj = this;
    if ("render_"  + field in this){
	return function(){obj["render_"  + field]()};
    }else{
	return function() {obj.render_field(field);};
    }
}
outline.Outline.prototype.hook_events = function(){
    var obj = this;
    var savetext = function(){
	var newval = obj.field_el('text').val();
	obj.set('text', newval);
	obj.save();
	delete obj.dirty['text'];
	console.log('blur')
    }
    var deletenode = function(){
	var parent = collections.get(obj.parent, 'outline')
	parent.remove_child(obj);
	collections.remove(obj.id, 'outline');
	parent.render();
    }
    var addnewnode = function(){
	var newnode = new outline.Outline(collections.new_id());
	var parent = collections.get(obj.parent, 'outline')
	parent.add_child(newnode);
	parent.render();
	newnode.field_el('text').delay(300).focus();
    }
    this.field_el('content').droppable(
        {'tolerance':'pointer',
	 'hoverClass': "ui-state-hover",
	 'drop': function(e, ui){
	     var dropping_id = ui.draggable.data()['id'];
	     var droppingnode = collections.get(dropping_id, 'outline');
	     var droppingparent = collections.get(droppingnode.parent, 'outline');
	     droppingparent.remove_child(droppingnode);
	     obj.add_child(droppingnode);
	     droppingparent.render();
	     obj.render();
	     ui.draggable.css('position', 'static');
	 }
	}
    );
            
    this.field_el('text').blur(savetext);
    this.field_el('text').keypress(function(e){
	if (e.keyCode == ENTER){
	    e.preventDefault();
	}
    });
    this.field_el('text').keyup(function(e){
	if (e.keyCode == ENTER){
	    obj.field_el('text').blur()
	    var newval = obj.field_el('text').val();
	    if (!newval && obj.get('children').length == 0){
	    }else{
		addnewnode();
	    }
	}else if (e.keyCode == BACKSPACE){
	    var newval = obj.field_el('text').val();
	    if (!newval && obj.get('children').length == 0
		&& obj.last_backspace_txt==newval){
		obj.field_el('text').blur();
		deletenode();
	    }
	    obj.last_backspace_txt = newval;
	}
    });    				   
    this.field_el('content').draggable({'revert':'invalid'});
    this.field_el('content').data({'id':this.id});
    this.field_el('fakedotcontainer').click(
	function(e){
	    toggle_controls(e, obj);
	}
    );
    
}


var toggle_controls = function(e, obj){
    var controls = obj.field_el('item-controls');
    var activator = obj.field_el('fakedotcontainer');
    var show = function(e){
	controls.show()
	var x = e.pageX;
	var y = e.pageY;
	x = x - 60;
	y = y - 10;
	x = 0 ? x<0 : x;
	y = 0 ? y<0 : y;
	controls.css(
	    {'top' : y + "px", 'left' : x + "px"}
	);
	var border = 10;
	var x3 = activator.offset().left;
	var x4 = x3 + activator.width();
	var y3 = activator.offset().top;
	var y4 = y3 + activator.height();

	var x1 = controls.offset().left;
	var x2 = x1 + controls.width();
	var y1 = controls.offset().top;
	var y2 = y1 + controls.height();

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
	controls.hide();
	$(document).unbind('click');
    }
    !controls.is(":visible") ? show(e) : hide(e);
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
	this.field_el('item-controls').hide();
    }
    var obj = this;
    _.each(this.fields, function(f){
	if (obj.dirty[f]){
	    obj.render_function(f).call(obj);
	    delete obj.dirty[f];
	}
    });
}


collections = new storage.Collections('id5', {'outline' : outline.Outline});
$(function(){
    collections.load_all();
    root_id = 'root'
    root = collections.get(root_id, 'outline');
    if (!root){
	root = new outline.Outline(root_id);
	root.save()
	newitem = new outline.Outline(collections.new_id());
	root.add_child(newitem)
    }
    root.render(true)
    $('#main-outline').append(root.el);
})
