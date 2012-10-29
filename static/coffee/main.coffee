$(() ->
    doc_id = $("#document_id").html()
    root_id = $("#root_id").html()
    mode = $('#mode').html()
    client_id = $('#client_id').html()
    $.get("/document/" + doc_id, (data) ->
        document = JSON.parse(data)
        outlines = document['outline']
        Efficiently.outlinenodes.add(outlines)
        root = Efficiently.outlinenodes.get(root_id)
        view = new Efficiently.BasicChildrenView(model : root)
        $(".rootnode").append(view.$el)
    )
)