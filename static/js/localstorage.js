use_local_storage = false;
storage = {};
storage.save = function(k, v){
    if (use_local_storage){
	localStorage.setItem(k, v);
    }
}

storage.S4 = function(){
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};
storage.timestamp = function(){
    return new Date().getTime();
};
storage.guid = function(store_id) {
    if (store_id){
	return store_id + "-" + storage.S4() + "-" + storage.timestamp();
    }else{
	return storage.S4() + "-" + storage.timestamp();
    }
};

storage.Collections = function(store_id, types){
    this.store_id = store_id;
    this.collections  = {};
    if (!types){
	types = {}
    }
    this.types = types;
    this.server_queue = {};
    this.saving = false;
}
storage.Collections.prototype.new_id = function(){
    return storage.guid(this.store_id);
}
storage.Collections.prototype.storage_key = function(key, collection){
    return JSON.stringify([this.store_id, key, collection]);
}
storage.Collections.prototype.parse_storage_key = function(storage_key){
    try{
	var data = JSON.parse(storage_key);
	if (data[0] == this.store_id){
	    return [data[1], data[2]]
	}else{
	    return null;
	}
    } catch(err) {
	console.log("unparseable "  + storage_key);
    }
}
storage.Collections.prototype.set_mem = function(key, value, collection){
    if (!(collection in this.collections)){
	this.collections[collection] = {};
    }
    this.collections[collection][key] = value;
}
storage.Collections.prototype.remove_mem = function(key, collection){
    if (!(collection in this.collections)){
	this.collections[collection] = {};
    }
    delete this.collections[collection][key];
}

storage.Collections.prototype.save = function(key, value, collection){
    //saves from local storage and adds to in memory data structure
    var serialized;
    if (collection in this.types){
	serialized = value.serialize();
    }else{
	serialized = JSON.stringify(value)
    }
    storage.save(this.storage_key(key, collection), serialized);
    this.save_server(value['id'], value, collection);
    this.set_mem(key, value, collection);
}
storage.Collections.prototype.remove = function(key, collection){
    delete localStorage[this.storage_key(key, collection)];
    this.remove_mem(key, collection);
}
storage.Collections.prototype.get = function(key, collection){
    if (!(collection in this.collections)){
	return null;
    }
    return this.collections[collection][key];
}
storage.Collections.prototype.load_all = function(){
    //retrieves from in memory structure
    if (!use_local_storage){
	return null;
    }
    for (var i=0, l=localStorage.length; i<l; i++){
        var storage_key = localStorage.key(i);
	var key;
	var data = this.parse_storage_key(storage_key);
	var collection;
	var val;
	if (!data){
	    continue;
	}
	key = data[0];
	collection = data[1];
        val = localStorage[storage_key];
	if (collection in this.types){
	    var tmp = new this.types[collection]()
	    tmp.deserialize(val);
	    val = tmp;
	
	}else{
	    val = JSON.parse(val);
	}
	this.set_mem(key, val, collection);
    }
}
storage.Collections.prototype.save_server_queue = function(){
    var obj = this;
    if (_.all(obj.server_queue, 
		    function(v, k){
			return $.isEmptyObject(v);
		    })){
	obj.saving = false;
	//console.log('empty no longer saving');
	return null;
    }
    obj.saving = true;
    //console.log('saving');
    var tosave = {}
    _.each(obj.server_queue,
	   function(collectionqueue, collectionname){
	       tosave[collectionname] = {}
	       _.each(collectionqueue, function(v, k){
		   tosave[collectionname][k] = v
		   delete obj.server_queue[collectionname][k];
	       });
	   });
    
    //console.log('posting')
    $.post("/bulk", {'data': JSON.stringify(tosave)},
	   function(x){
	       obj.save_server_queue();
	   }).error(function(x){alert('failure saving')});
}
storage.Collections.prototype.save_server = function(k, v, collection){
    var obj = this;
    if (collection in this.types){
	v = v.to_dict();
    }
    if (!(collection in this.server_queue)){
	this.server_queue[collection] = {}
    }
    this.server_queue[collection][k] = v;
    if (this.saving){
	return null;
    }else{
	this.save_server_queue();
    }
    
}

