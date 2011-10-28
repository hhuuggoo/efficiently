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
outline.Outline.prototype.render_children = function(field){

}
outline.Outline.prototype.render_function = function(field){
    var obj = this;
    if ("render_"  + field in this){
	return this["render_" + field];
    }else{
	return function(f) {obj.render_field(f);};
    }
}
outline.Outline.prototype.render = function(){
    if (!this.el){
	this.el = $(this.template(this.to_dict()));
    }
    var obj = this;
    _.each(this.fields, function(f){
	
	if (obj.dirty[f]){
	    obj.render_function(f)();
	    delete obj.dirty[f];
	}
    });
}

$(function(){
    mycollections = new storage.Collections('id5', {'outline' : outline.Outline});
    mycollections.load_all();
    var root_id = 'id1'
    var root = mycollections.get(root_id, 'outline')
    root.render()
    $('#main-outline').append(root.el);
})
