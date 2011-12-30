var model = {}
model.Model = function() {
    this.dirty = {};
}
model.Model.prototype.setter_name = function(field){
    return _.sprintf("_%s_setter" , field);
};
model.Model.prototype.getter_name = function(field){
    return _.sprintf("_%s_getter", field);
};
model.Model.prototype.set = function(field, value, force_default){
    if (this.setter_name(field) in this){
	this[this.setter_name(field)](value);
    }else{
	this[field] = value;
    }
    this.dirty[field] = true;
};
model.Model.prototype.get = function(field){	
    if (this.getter_name(field) in this){
	return this[this.getter_name(field)](field);
    }else{
	return this[field];
    }
};

model.Model.prototype.to_dict = function(){
    var data = {}
    var obj = this;
    _.each(this.fields, 
	   function(f){
	       data[f] = obj.get(f);
	   });
    return data;

}

model.Model.prototype.update = function(data){
    var obj = this;
    _.each(this.fields,
	   function(f){
	       if (f in data){
		   obj.set(f, data[f]);
	       }
	   });
}

model.Model.prototype.serialize = function(){
    return JSON.stringify(this.to_dict());
}

model.Model.prototype.deserialize = function(str){
    var data = JSON.parse(str);
    this.update(data);
}

model.Model.prototype.field_id = function(fld){
    if (!fld){
	return this.get('id');
    }else{
	return this.get('id') + "-" + fld;
    }
}
model.Model.prototype.field_el = function(fld){
    if (!fld){
	return this.el;
    }else{
	return $("#" + this.field_id(fld), this.el);
    }
}

model.Model.prototype.render_function = function(field){
    var obj = this;
    if ("render_"  + field in this){
	return function(){obj["render_"  + field]()};
    }else{
	return function() {obj.render_field(field);};
    }
}

model.Model.prototype.render_field = function(field){
    $("#" + this.field_id(field), this.el).html(this.get(field));
}

model.Model.prototype.render = function(isroot){
    if (!this.el){
	this.el = $(this.template(this.to_dict()));
	this.hook_events()
    }
    var obj = this;
    _.each(this.fields, function(f){
	if (obj.dirty[f]){
	    obj.render_function(f).call(obj);
	    delete obj.dirty[f];
	}
    });
}

model.Model.prototype.template = function(){
}
model.Model.prototype.hook_events = function(){
}