function Model() {
    this.dirty = {};
};
Model.prototype.setter_name = function(field){
    return _.sprintf("_%s_setter" , field);
};
Model.prototype.getter_name = function(field){
    return _.sprintf("_%s_getter", field);
};
Model.prototype.set = function(field, value){
    if (this.setter_name(field) in this){
	this[this.setter_name(field)](value);
    }else{
	this[field] = value;
    }
    this.dirty[field] = true;
};
Model.prototype.get = function(field){	
    if (this.getter_name(field) in this){
	return this[this.getter_name(field)](field);
    }else{
	return this[field];
    }
};

