
$(()->
  $('#loginlink').click(() ->
    $('#loginmodal').modal({'show' : true})
  )
  $('#registerlink').click(() ->
    $('#registermodal').modal({'show' : true})
  )
  $('#createlink').click(() ->
    $('#createmodal').modal({'show' : true})
  )

)
