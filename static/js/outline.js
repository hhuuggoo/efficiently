var outline = {}
outline.Outline = function(){
    this.name = ""
    this.dirty = {};
}
outline.Outline.prototype = new model.Model()
outline.Outline.prototype._name_setter = function(value){
    console.log('name');
    console.log(value);
    this.name = value;
}



a = new outline.Outline();
b = new outline.Outline();
a.set('name', 'sdf');
console.log(a.dirty);
console.log(b.dirty);
