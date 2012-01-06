$(function(){
    window.register_sockets = function(){
	window.active_doc.socket_subscriber = new io.Socket(
	    window.location.hostname, {'port': 443, 'secure' : true, 
				       'rememberTransport':false,
				       'transports' : ['xhr-multipart', 'xhr-polling', 'jsonp-polling']
				      }
	)
	window.active_doc.socket_subscriber.connect()
	window.active_doc.socket_subscriber.render_queue = {}
	window.active_doc.socket_subscriber.on(
	    'message',
	    function(data){
		var sub = window.active_doc.socket_subscriber
		var data  = JSON.parse(data);
		if (data['type'] == 'registration_confirmation'){
		    window.active_doc.socket_subscriber.id = data['clientid']
		}else{
		    _.each(data['outline'],
			   function(x){
			       var node = window.collections.get(
				   x['id'], 'outline');
			       if (node){
				   node.update(x);
			       }else{
				   node = new outline.Outline();
				   node.update(x)
				   window.collections.set_mem(
				       node.get('id'), node, 'outline');
			       }
			       // console.log(['updated', node.get('id')]);
			       sub.render_queue[node.get('id')] = node;
			   });
		    var to_process, process_later;
		    to_process = _.filter(_.keys(sub.render_queue), 
					  function(x){
					      var node = window.collections.get(x, 'outline');
					      var parent = node.get('parent')
					      var children = node.get('children')
					      var parent_loaded = !parent || window.collections.get(parent, 'outline');
					      var children_loaded = !children || _.all(
						  children,
						  function(x){
						      return window.collections.get(x, 'outline');
						  });
					      return parent_loaded && children_loaded;
					  });
		    process_later = _.filter(_.keys(sub.render_queue),
					     function(x){
						 var node = window.collections.get(x, 'outline');
						 var parent = node.get('parent')
						 var children = node.get('children')
						 var parent_loaded = !parent || window.collections.get(parent, 'outline');
						 var children_loaded = !children || _.all(
						     children,
						     function(x){
							 return window.collections.get(x, 'outline');
						     });
						 return !(parent_loaded && children_loaded);
					     });
		    // console.log(['process_now', to_process]);
		    // console.log(['process_later', process_later]);
					
		    _.each(to_process, function(x){
			window.collections.get(x, 'outline').render();
		    });
		    sub.render_queue = {};
		    _.each(process_later, function(x){
			sub.render_queue[x] = window.collections.get(x, 'outline');
		    });
		}
	    });
	window.active_doc.socket_subscriber.on('connect', function(){
	    console.log('connected sockets');
	    window.active_doc.socket_subscriber.send(JSON.stringify({'type':'registration', 'docid' : window.active_doc.id}));
	    $('#connected').html('CONNECTED: edits from others will appear instantly!');
	});
	window.active_doc.socket_subscriber.on('disconnect', function(){
	    console.log('disconnected sockets');
	    $('#connected').html('disconnected');
	});

    }

});
	

