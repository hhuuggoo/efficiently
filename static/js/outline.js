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
    _.each(ids, function(id){
	var child = collections.get(id, 'outline');
	child.render();
	$("#" + obj.field_id('children'), obj.el).append(child.el);
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
outline.Outline.prototype.hook_events = function(){
    var obj = this;
    var savetext = function(e){
	var newval = $("#" + obj.field_id('text')).val();
	obj.set('text', newval);
	obj.save();
	delete obj.dirty['text'];
	console.log('blur')
	e.preventDefault();
    }
    this.field_el('text').blur(savetext);
    this.field_el('text').keypress(function(e){
	if (e.keyCode == ENTER){
	    e.preventDefault();
	}
    });
    this.field_el('text').keyup(function(e){
	if (e.keyCode == ENTER){
	    obj.field_el('text').blur();
	    var newnode = new outline.Outline(collections.new_id());
	    var parent = collections.get(obj.parent, 'outline')
	    parent.add_child(newnode);
	    parent.render();
	    newnode.field_el('text').delay(2000).focus();
	}else if (e.keyCode == BACKSPACE){
	    if (!obj.get('text')){
		var parent = collections.get(obj.parent, 'outline')
		parent.remove_child(obj);
		collections.remove(obj.id, 'outline');
		parent.render();
	    }
	}
    });    				   
    this.field_el('content').draggable({'revert':'invalid'});
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
