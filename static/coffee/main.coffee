$(() ->
    doc_id = $("#document_id").html()
    window.doc_id = $("#document_id").html()
    root_id = $("#root_id").html()
    mode = $('#mode').html()
    client_id = $('#client_id').html()
    Efficiently.OutlineNode::sync = (method, model, options) ->
      console.log('sync')
      if model.id of model.collection.storage
        options.success(model)
      else
        @collection.storage[model.id] = model
        @collection.sync_all()

    $.get("/document/" + doc_id, (data) ->
        document = JSON.parse(data)
        outlines = document['outline']
        document = new Efficiently.Document(id : doc_id)
        Efficiently.outlinenodes.add(outlines, {'doc' : document})
        root = Efficiently.outlinenodes.get(root_id)
        if root.get('children').length == 0
          newnode = document.newnode(text : "Just start typing!")
          newnode.save()
          root.add_child(newnode)
        docview = new Efficiently.DocView(
          doc : document
          root : root
          el : $('.rootnode')
        )
        keyeventer = new Efficiently.KeyEventer(
          docview : docview
        )
        window.keyeventer = keyeventer
        keyeventer.select_first_node()
        window.docview = docview
    )
)