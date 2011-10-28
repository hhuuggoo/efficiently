storage = {};
storage.S4 = function(){
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};
storage.timestamp = function(){
    return new Date().getTime();
};
storage.guid = function(store_id) {
    if (store_id){
	return store_id + "-" + S4() + "-" + timestamp();
    }else{
	return S4() + "-" + timestamp();
    }
};

storage.Collections = function(store_id){
    this.store_id = store_id;
    this.collections  = {};
    this.types = {};
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

storage.Collections.prototype.save = function(key, value, collection){
    //saves from local storage and adds to in memory data structure
    var serialized;
    if (collection in this.types){
	serialized = this.types[collection].serialize(value);
    }else{
	serialized = JSON.stringify(value)
    }
    localStorage.setItem(this.storage_key(key, collection), JSON.stringify(value));
    this.set_mem(key, value, collection);
}
storage.Collections.prototype.get = function(key, collection){
    return this.collections[collection][key];
}
storage.Collections.prototype.load_all = function(){
    //retrieves from in memory structure
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
	    val = this.types[collection].deserialize(val);
	}else{
	    val = JSON.parse(val);
	}
	this.set_mem(key, val, collection);
    }
}

mystore = new storage.Collections('id5');
mystore.load_all();
mystore.save('1', [1,2,3,4,5], 'array')
mystore.save('1', {'a':1}, 'dict')

