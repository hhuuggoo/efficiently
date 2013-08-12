
$(()->
  $('#loginlink').click(() ->
    $('#loginmodal').modal({'show' : true})
    $('#loginmodal').find('input:text:visible:first').focus()
  )
  $('#registerlink').click(() ->
    $('#registermodal').modal({'show' : true})
    $('#registermodal').find('input:text:visible:first').focus()
  )
  $('#createlink').click(() ->
    $('#createmodal').modal({'show' : true})
    $('#createmodal').find('input:text:visible:first').focus()
  )
  $('#sharelink').click(() ->
    $('#sharemodal').modal({'show' : true})
    $('#sharemodal').find('input:text:visible:first').focus()
  )

)
