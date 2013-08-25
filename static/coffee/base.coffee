
$(()->
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
  $('#whyupgrade').click(() ->
    $('#whyupgrademodal').modal({'show' : true})
    $('#whyupgrademodal').find('input:text:visible:first').focus()
  )

)
