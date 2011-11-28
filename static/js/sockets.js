$(function(){
    window.register_sockets = function(){
	window.active_doc.socket_subscriber = new io.Socket(
	    window.location.hostname, {'port': 443, 'secure' : true, 'rememberTransport':true}
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
			var node = window.collections.get(id, 'outline')
			if (!node){
			    node = new outline.Outline();
			}
			node.update(v)
			_.each(node.get('children'), function(nodeid){
			    if (!window.collections.get(nodeid, 'outline')){
				var newnode = new outline.Outline(nodeid,
								  node.documentid);
				window.collections.set_mem(nodeid, 
							   newnode,
							  'outline');
			    }
			});
			node.render()
			node.field_el('content').fadeOut(100).delay(100).fadeIn(100);
		    });
		}
	    }
	);
	window.active_doc.socket_subscriber.on('connect', function(){
	    console.log('connected sockets');
	    window.active_doc.socket_subscriber.send(JSON.stringify({'type':'registration', 'docid' : window.active_doc.id}));
	    $('#connected').html('connected');
	});
	window.active_doc.socket_subscriber.on('disconnect', function(){
	    console.log('disconnected sockets');
	    $('#connected').html('disconnected');
	});

    }

});
	

