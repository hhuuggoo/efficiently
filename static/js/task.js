function Task(){
    this.name = ""
    this.dirty = {};
}
Task.prototype = new Model()
Task.prototype._name_setter = function(value){
    console.log('name');
    console.log(value);
    this.name = value;
}

a = new Task();
b = new Task();
a.set('name', 'hello');

console.log(a.dirty);
console.log(b.dirty);