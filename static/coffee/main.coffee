$(() ->
    doc_id = $("#document_id").html()
    root_id = $("#root_id").html()
    mode = $('#mode').html()
    client_id = $('#client_id').html()
    $.get("/document/" + doc_id, (data) ->
        document = JSON.parse(data)
        outlines = document['outline']
        document = new Efficiently.Document()
        Efficiently.outlinenodes.add(outlines, {'doc' : document})
        root = Efficiently.outlinenodes.get(root_id)
        docview = new Efficiently.DocView(
          doc : document
          root : root
          el : $('.rootnode')
        )
        keyeventer = new Efficiently.KeyEventer(
          docview : docview
        )
        window.keyeventer = keyeventer
        window.docview = docview
    )
)