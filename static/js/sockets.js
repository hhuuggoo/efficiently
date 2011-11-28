$(function(){
    window.register_sockets = function(){
	window.active_doc.socket_subscriber = new io.Socket(
	    window.location.hostname, {'secure' : true, 'rememberTransport':false}
	)
	window.active_doc.socket_subscriber.connect()
	window.active_doc.socket_subscriber.on(
	    'message',
	    function(data){
		var data  = JSON.parse(data);
		if (data['type'] == 'registration_confirmation'){
		    window.active_doc.socket_subscriber.id = data['clientid']
		}else{
		    _.each(data['outline'], function(v){
			var id = v['id']
			window.collections.get(id, 'outline').update(v)
			window.collections.get(id, 'outline').render()
			window.collections.get(id, 'outline').field_el('content').fadeOut(100).delay(100).fadeIn(100);
		    });
		}
	    }
	);
	window.active_doc.socket_subscriber.on('connect', function(){
	    console.log('connected sockets');
	    window.active_doc.socket_subscriber.send(JSON.stringify({'type':'registration', 'docid' : window.active_doc.id}));
	});
    }

});
	

