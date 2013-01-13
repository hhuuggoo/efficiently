$(() ->
    doc_id = $("#document_id").html()
    window.doc_id = $("#document_id").html()
    root_id = $("#root_id").html()
    mode = $('#mode').html()
    client_id = $('#client_id').html()
    Efficiently.OutlineNode::sync = (method, model, options) ->
      console.log('sync')
      if model.id of model.collection.storage
        options.success({})
      else
        @collection.storage[model.id] = model
        @collection.sync_all()

    $.get("/document/" + doc_id, (data) ->
        document = data
        outlines = document['outline']
        token = document['token']
        wsurl = document['wsurl']
        document = new Efficiently.Document(id : doc_id)
        window.document = document
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
        Efficiently.wscache = new Efficiently.WSOutlineCache(
          Efficiently.outlinenodes, document
        )
        window.websocket = new BBoilerplate.WebSocketWrapper(wsurl)
        if mode == 'rw'
          topic = "docrw:#{doc_id}"
        else
          topic = "docr:#{doc_id}"
        $.when(window.websocket.connected).then(() ->
          msg = JSON.stringify(
            msgtype : 'subscribe',
            topic : topic,
            auth : token
          )
          window.websocket.s.send(msg)
        )
        window.websocket.on("msg:#{topic}", (msg) ->
          msgobj = JSON.parse(msg)
          if msgobj['msgtype'] == 'status'
            console.log('status', msgobj)
            clientid = msgobj['status'][2]
            $.ajaxSetup({'headers' : {'WS-Clientid' : clientid}})
            Efficiently.clientid = clientid
          if msgobj['msgtype'] == 'modelupdate'
            outlines = msgobj['outline']
            Efficiently.wscache.addnode(outlines)
            Efficiently.wscache.update_collection()
        )
        window.websocket.on("close", () ->
          $('#reconnectmodal').modal({'show' : true})
        )
        $('#reconnectbutton').click( () ->
          window.websocket.connect()
          $.when(window.websocket.connected).then(() ->
            msg = JSON.stringify(
              msgtype : 'subscribe',
              topic : topic,
              auth : token
            )
            window.websocket.s.send(msg)
            $.get("/document/" + doc_id, (data) ->
               document = data
               token = document['token']
               outlines = document['outline']
               Efficiently.wscache.addnode(outlines)
               Efficiently.wscache.update_collection()
            )
          )
        )
    )
)