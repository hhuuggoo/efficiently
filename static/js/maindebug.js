// Generated by CoffeeScript 1.3.3
(function() {

  $(function() {
    var client_id, doc_id, mode, root_id;
    doc_id = $("#document_id").html();
    window.doc_id = $("#document_id").html();
    root_id = $("#root_id").html();
    mode = $('#mode').html();
    client_id = $('#client_id').html();
    Efficiently.OutlineNode.prototype.sync = function(method, model, options) {
      console.log('sync');
      if (model.id in model.collection.storage) {
        return options.success({});
      } else {
        this.collection.storage[model.id] = model;
        return this.collection.sync_all();
      }
    };
    return $.get("/document/" + doc_id, function(data) {
      var document, docview, keyeventer, newnode, outlines, root, token, wsurl;
      document = data;
      outlines = document['outline'];
      token = document['token'];
      wsurl = document['wsurl'];
      document = new Efficiently.Document({
        id: doc_id
      });
      window.doc = document;
      Efficiently.outlinenodes.add(outlines, {
        'doc': document
      });
      root = Efficiently.outlinenodes.get(root_id);
      if (root.get('children').length === 0) {
        newnode = document.newnode({
          text: "Just start typing!"
        });
        newnode.save();
        root.add_child(newnode);
      }
      window.rootfoo = root_id;
      window.root = root;
      docview = new Efficiently.DocView({
        doc: document,
        root: root,
        el: $('.rootnode')
      });
      window.docview = docview;
      return keyeventer = new Efficiently.KeyEventer({
        docview: docview
      });
    });
  });

}).call(this);
