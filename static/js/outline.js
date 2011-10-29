var outline = {}
outline.Outline = function(id){
    this.set('id', id);
    this.set('text', '');
    this.set('todostate', null);
    this.set('hidden', false);
    this.set('date', null);
    this.dirty = {};
    this.el = null;
}

outline.Outline.prototype = new model.Model()
outline.Outline.prototype.fields = ['id', 'text', 'todostate', 
				    'hidden', 'date', 'children']
outline.Outline.prototype.template = _.template($('#outline-template').html())
outline.Outline.prototype.field_id = function(fld){
    return this.get('id') + "-" + fld;
}
outline.Outline.prototype.render_field = function(field){
    $("#" + this.field_id(field), this.el).html(this.get(field));
}
outline.Outline.prototype.render_text = function(){
    $("#" + this.field_id('text'), this.el).val(this.get('text'));
}
outline.Outline.prototype.save = function(){
    collections.save(this.id, this, 'outline');
}
outline.Outline.prototype.render_children = function(){
    var ids = this.get('children');
    var obj = this;
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
outline.Outline.prototype.render = function(){
    if (!this.el){
	this.el = $(this.template(this.to_dict()));
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
    var root_id = 'id1'
    var root = collections.get(root_id, 'outline')
    root.render()
    $('#main-outline').append(root.el);
})
