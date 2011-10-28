var task = {}
task.Task = function(){
    this.name = ""
    this.dirty = {};
}
task.Task.prototype = new model.Model()
task.Task.prototype._name_setter = function(value){
    console.log('name');
    console.log(value);
    this.name = value;
}



a = new task.Task();
b = new task.Task();
a.set('name', 'sdf');
console.log(a.dirty);
console.log(b.dirty);
