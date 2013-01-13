# ###class : WebsocketWrapper
# wraps websockets, provides a @connected promise, which
# you can wait on before sending subscription messages
# also triggers "msg:topic" events, with an arg of the msg
# data.  We assume that msg data over this websocket
# channel are sent in "topic:data" form, where data can
# be any arbitrary string. note that since topic is prefixed with :,
# in practice a message looks like cdxplot:docid:jsondata
class BBoilerplate.WebSocketWrapper
  _.extend(@prototype, Backbone.Events)
  # ### method :
  constructor : (ws_conn_string) ->
    @ws_conn_string = ws_conn_string
    @_connected = $.Deferred()
    @connected = @_connected.promise()
    try
      @s = new WebSocket(ws_conn_string)
    catch error
      @s = new MozWebSocket(ws_conn_string)
    @s.onopen = () =>
      @_connected.resolve()
    @s.onmessage = @onmessage
    return @

  onmessage : (msg) =>
    data = msg.data
    index = data.indexOf(":") #first colon marks topic namespace
    index = data.indexOf(":", index + 1) #second colon marks the topic
    topic = data.substring(0, index)
    data = data.substring(index + 1)
    @trigger("msg:" + topic, data)
    return null
