if this.Efficiently
  Efficiently = this.Efficiently
else
  Efficiently = {}
  this.Efficiently = Efficiently

class Efficiently.EfficientlyModel extends BBoilerplate.HasProperties
  url : () ->
    return super()


class Efficiently.BasicNodeView extends BBoilerplate.BasicView
  initialize : (options) ->
    super(options)
    @viewstate = options.viewstate
    @docview = options.docview
    options.nodeview = @
    @contentview = new Efficiently.BasicNodeContentView(options)
    @childrenview = new Efficiently.BasicChildrenView(options)
    @docview.register(@model.id, this, @viewstate)
    @render()

  remove : () ->
    @docview.deregister(this, @viewstate)
    return super()

  tree_apply : (func, level) ->
    func(this);
    if level > 0
      newlevel = level - 1
    else if _.isNull(level)
      newlevel = null
    else
      return null
    children = @get('children')
    for childid in children
      child = @collection.get(childid)
      child.tree_apply(func, newlevel)
    return null

  delegateEvents : (events) ->
    BBoilerplate.safebind(this, @model, "destroy", @destroy)
    BBoilerplate.safebind(this, @model, "change:children", @render)
    BBoilerplate.safebind(this, @viewstate, "change:outline", @render_outline)
    BBoilerplate.safebind(this, @viewstate, "change:all_hidden", @render)
    return this

  render_outline : () ->
    outline_state = @viewstate.get('outline')
    if outline_state == 'show_children'
      @docview.show_children(@model)
    if outline_state == 'show_all'
      @docview.show_all_children(@model)
    if outline_state == 'hide_all'
      @docview.hide_all_children(@model)
    @docview.getview(@model.id).render()

  make_view : (model, options) ->
    options = options || {}
    options = _.extend({}, options)
    viewstate = new Efficiently.OutlineViewState({'model' : model})
    options.model = model
    options.viewstate = viewstate
    options.docview = @docview
    view = new Efficiently.BasicNodeView(options)
    return view

  render : () ->
    @contentview.$el.detach()
    @childrenview.$el.detach()
    @$el.addClass('outline')
    @$el.addClass('clearfix')
    @$el.append(@contentview.$el)
    @$el.append(@childrenview.$el)
    if @docview.children(@model, true).length == 0
      @childrenview.$el.hide()
    else
      @childrenview.$el.show()


  remove : () ->
    @contentview.remove()
    @childrenview.remove()
    super()

  nodetext : () ->
    if @viewstate.get('edit')
      @contentview.save()
    return @mget('text')

  getview : (id) ->
    return @docview.nodeviews[id]

  getviewstate : (id) ->
    return @docview.viewstates[id]

class Efficiently.OutlineViewState extends Efficiently.EfficientlyModel
  outline_states : ['hide_all', 'show_children', 'show_all']
  defaults :
    hide : false
    edit : false
    select : false
    outline : 'show_all'

  toggle_outline_state : () =>
    outline_state = @get('outline')
    if outline_state == 'hide_all'
      @set('outline', 'show_children')
    else if outline_state == 'show_children'
      @set('outline', 'show_all')
    else
      @set('outline', 'hide_all')
    console.log('setting', outline_state, @get('outline'))
    return null

  initialize : (attrs, options) ->
    super(attrs, options)
    @register_property('all_hidden',
      () -> _.all(@get('children_hide_status'), (x) -> return x),
      true)
    @add_dependencies('all_hidden', @, 'children_hide_status')
    @register_property('any_hidden',
      () -> _.any(@get('children_hide_status'), (x) -> return x),
      true)
    @add_dependencies('any_hidden', @, 'children_hide_status')

  #this seems overly complex
  set_child_viewstates : (child_viewstates) ->
    @register_property('children_hide_status', () ->
        return _.map(child_viewstates, ((model) -> model.get('hide')))
      , null, true
    )
    for viewstate in child_viewstates
      @add_dependencies('children_hide_status', viewstate, 'hide')
    @trigger("change:children_hide_status")
    @trigger("change")



class Efficiently.KeyEventer extends BBoilerplate.BasicView
  keycodes :
    UP : 38
    DOWN : 40
    LEFT : 37
    RIGHT : 39
    ENTER : 13
    TAB : 9
    GT : 190
    LT : 188
    SLASH : 191
    S_KEY : 83
    F_KEY : 70
    R_KEY : 82
    P_KEY : 80
    L_BRACKET : 219
    R_BRACKET : 221
    BACKSPACE : 8
    DELETE : 46
    O_KEY : 79

  initialize : (options) ->
    super(options)
    @docview = options.docview
    @keycodes = Efficiently.KeyEventer::keycodes

  delegateEvents : (events) ->
    super(events)
    $(document).bind('keydown.keyeventer', @keydown)
    return this

  undelegateEvents : (events) ->
    super(events)
    $(document).unbind('keydown.keyeventer')

  modified : (e) =>
    return e.ctrlKey || e.shiftKey || e.altKey

  nsmodified : (e) =>
    return e.ctrlKey || e.altKey

  keydown : (e) =>
    func = @get_keyfunction(e)
    if (func)
      return func(e)
    else
      return true

  get_keyfunction : (e) =>
    modified = @modified(e)
    nsmodified = @nsmodified(e)
    if not modified and e.keyCode == @keycodes.DOWN
      return @cursor_down
    if not modified and e.keyCode == @keycodes.UP
      return @cursor_up
    if not modified and e.keyCode == @keycodes.ENTER
      return @enter
    if modified and e.keyCode == @keycodes.ENTER
      return @modenter
    if modified and e.keyCode == @keycodes.ENTER
      return @modenter
    if modified and e.keyCode == @keycodes.BACKSPACE
      return @deletenode
    if not modified and e.keyCode == @keycodes.BACKSPACE
      return @deletekey
    if e.keyCode == @keycodes.DELETE
      return @deletenode
    if modified and e.keyCode == @keycodes.RIGHT
      return @moveright
    if modified and e.keyCode == @keycodes.LEFT
      return @moveleft
    if modified and e.keyCode == @keycodes.UP
      return @moveup
    if modified and e.keyCode == @keycodes.DOWN
      return @movedown
    if nsmodified and e.keyCode == @keycodes.GT
      return @toggle_outline
    if nsmodified and e.keyCode == @keycodes.SLASH
      return @toggle_outline_global
    @docview.currview().contentview.save()
    return null

  toggle_outline_global : (e) =>
    if @docview.outline_state == 'hide_all'
      @docview.outline_state = 'show_children'
    else if @docview.outline_state == 'show_children'
      @docview.outline_state = 'show_all'
    else
      @docview.outline_state = 'hide_all'
    for child in @docview.children(@docview.model, false)
      @docview.getviewstate(child.id).set('outline', @docview.outline_state)
    return false

  toggle_outline : (e) =>
    @docview.currview().viewstate.toggle_outline_state()
    return false

  moveup : (e) =>
    parent = @docview.currnode.parent()
    curridx = parent.child_index(@docview.currnode)
    if curridx == 0
      return false
    else
      parent.reorder_child(@docview.currnode, curridx - 1)
      return false

  movedown : (e) =>
    parent = @docview.currnode.parent()
    curridx = parent.child_index(@docview.currnode)
    if curridx == parent.num_children()
      return false
    else
      parent.reorder_child(@docview.currnode, curridx + 1)
      return false

  moveright : (e) =>
    parent = @docview.currnode.parent()
    upper_sibling = @docview.upper_sibling(@docview.currnode, true)
    if upper_sibling != parent and upper_sibling
      @docview.currview().contentview.save() #save cause view is going away
      parent.remove_child(@docview.currnode)
      upper_sibling.add_child(@docview.currnode)
    @docview.select(@docview.currnode)
    return false

  moveleft : (e) =>
    parent = @docview.currnode.parent()
    if not parent
      return false
    grandparent = parent.parent()
    if not grandparent
      return false
    @docview.currview().contentview.save()
    curridx = grandparent.child_index(parent)
    parent.remove_child(@docview.currnode)
    grandparent.add_child(@docview.currnode, curridx + 1)
    @docview.select(@docview.currnode)
    return false

  deletekey : (e) =>
    if not @docview.nodeviews[@docview.currnode.id].nodetext()
      return @deletenode(e)
    return true

  deletenode : (e) =>
    nextnode = @docview.upper_node(@docview.currnode, true)
    if not nextnode
      nextnode = @docview.lower_node(@docview.currnode, true)
    parent = @docview.currnode.parent()
    parent.remove_child(@docview.currnode)
    @docview.unselect()
    if nextnode
      @docview.select(nextnode, true)
    return false

  select_first_node : () =>
    @docview.select(@docview.children(@docview.root, true)[0],
      true)

  cursor_down : () =>
    if not @docview.currnode or @docview.currviewstate().get('hide')
      @select_first_node()
    else
      newnode = @docview.lower_node(@docview.currnode, true)
      @docview.select(newnode, true)
    return false

  cursor_up : () =>
    if not @docview.currnode or @docview.currviewstate().get('hide')
      @select_first_node()
    else
      newnode = @docview.upper_node(@docview.currnode, true)
      @docview.select(newnode, true)
    return false

  enter : (e) =>
    parent = @docview.currnode.parent()
    curridx = parent.child_index(@docview.currnode)
    newnode = Efficiently.outlinenodes.create()
    newnode = @docview.currnode.add_sibling(newnode, curridx + 1)
    e.preventDefault()
    @docview.select(newnode)
    return false

  modenter : (e) =>
    newnode = Efficiently.outlinenodes.create()
    newnode = @docview.currnode.add_child(newnode)
    e.preventDefault()
    @docview.select(newnode)
    @docview.currnode = newnode
    return false

class Efficiently.DocView extends Efficiently.BasicNodeView
  initialize : (options) ->
    @nodeviews = {}
    @viewstates = {}
    @root = options.root
    @model = options.root
    @outline_state = 'show_all'
    @docview = this
    BBoilerplate.safebind(this, @model, "destroy", @destroy)
    @viewstate = new Efficiently.OutlineViewState(
      model : @root
    )
    view = new Efficiently.BasicChildrenView(
      model : @root
      viewstate : @viewstate
      docview : this
      nodeview : this
    )
    @register(@root.id, this, @viewstate)
    @childrenview = view
    @render()
    @currnode = null
    return this

  delegateEvents : (events) ->
    super(events)
    BBoilerplate.safebind(this, @model, "destroy", @destroy)
    return this
  currview : () ->
    return @nodeviews[@currnode.id]

  currviewstate : () ->
    return @viewstates[@currnode.id]

  unselect : () ->
    if @currnode
      @currview().contentview.unfocus()
      @viewstates[@currnode.id].set(
        select: false
        edit : false
      )
      @currnode = null

  select : (node, toedit) ->
    @unselect()
    @currnode = node
    if _.isUndefined(toedit)
      toedit = true
    @viewstates[node.id].set(
      select: true
      edit : toedit
    )

  render : () ->
    @$el.html('')
    @$el.append(@childrenview.$el)

  deregister : (id) ->
    delete @nodeviews[id]
    delete @viewstates[id]
    return

  register : (id, view, viewstate) ->
    @nodeviews[id] = view
    @viewstates[id] = viewstate
    return

  children : (node, visible) ->
    if not visible
      return node.children()
    viewstate = @viewstates[node.id]
    if viewstate.get('hide_children')
      return []
    else
      children = node.children()
      children = _.filter(children, (child) =>
        return not @viewstates[child.id].get('hide')
      )
      return children

  child_index : (parent, node, visible) ->
    children = @children(parent, visible)
    childids = _.map(children, (x) -> x.id)
    return _.indexOf(childids, node.id)

  lower_sibling : (node, visible) ->
    parent = node.parent()
    if not parent
      return null
    curridx = @child_index(parent, node, visible)
    children = @children(parent, visible)
    if curridx < children.length - 1
      return children[curridx + 1]
    else
      return null

  lower_node : (node, visible) ->
    children = @children(node, visible)
    if children.length > 0
      return children[0]
    else
      nodeiter = node
      while (true)
        lower_sibling = @lower_sibling(nodeiter, visible)
        if !lower_sibling and nodeiter.id != @root.id
          nodeiter = nodeiter.parent()
        else if !lower_sibling and nodeiter.id == @root.id
          return null
        else if lower_sibling
          return lower_sibling

  upper_sibling : (node, visible) ->
    parent = node.parent()
    if !parent
      return null
    curridx = @child_index(parent, node, visible)
    children = @children(parent, visible)
    if curridx != 0
      return children[curridx - 1]
    else
      return null

  bottom_most_descendant: (node, visible) ->
    nodeiter = node
    while true
      children = @children(nodeiter, visible)
      if children.length == 0
        return nodeiter
      else
        nodeiter = _.last(children)
    return null

  upper_node : (node, visible) ->
    parent = node.parent()
    upper_sibling = @upper_sibling(node, visible)
    if !upper_sibling
      return parent
    else
      return @bottom_most_descendant(upper_sibling, visible)
    return null

  hide : (node) =>
    @getviewstate(node.id).set('hide', true)

  unhide : (node) =>
    @getviewstate(node.id).set('hide', false)

  show_children : (node) ->
    children = @children(node, false)
    for child in children
      for grandchild in @children(child, false)
        @hide(grandchild)
      @unhide(child)
    return null

  show_all_children : (node) ->
    node.tree_apply(@unhide, null)
    return null

  hide_all_children : (node) ->
    children = @children(node, false)
    for child in children
      @hide(child)
    return null

class Efficiently.Document extends Efficiently.EfficientlyModel
  defaults :
    title : ''
    todostates : ["TODO", "INPROGRESS", "DONE"]
    todocolors :
      TODO : 'red'
      INPROGRESS : 'red'
      DONE : 'green'

  initialize : (attrs, options) ->
    super(attrs, options)
    @state_regexp_map = @make_state_regexp_map()

  make_state_regexp_map : () ->
    map = {}
    for state in @get('todostates')
      map[state] = new RegExp("(^#{state} )")
    return map

class Efficiently.OutlineNode extends Efficiently.EfficientlyModel
  collection_ref : ['Efficiently', 'outlinenodes']
  initialize : (attrs, options) ->
    super(attrs, options)
    @doc = options.doc
    if _.isNull(attrs.children)
      @set('children', [])

  defaults:
    documentids : null
    text : ''
    parent : null
    children : null

  add_sibling : (child, index) ->
    return @parent().add_child(child, index)

  reorder_child : (child, index) ->
    children = @get('children')
    children = _.filter(children, ((x) -> return x != child.id))
    children.splice(index, 0, child.id)
    @set('children', children)
    @save()

  add_child : (child, index) ->
    newchildren = @get('children').slice(0)
    if not index
      newchildren.push(child.id)
    else
      newchildren.splice(index, 0, child.id)
    #need new array to trigger backbone change events.. not ideal
    @set('children', newchildren)
    child.set('parent', @id)
    this.save()
    child.save()
    return child

  num_children : () ->
    return @get('children').length

  child_index : (child) ->
    return _.indexOf(@get('children'), child.id)

  child : (index) ->
    return @collection.get(@get('children')[index])

  parent : () ->
    return @collection.get(@get('parent'))

  children : () ->
    return (@collection.get(x) for x in @get('children'))

  remove_child : (child) ->
    child.set('parent', null)
    child.save()
    children = @get('children')
    children = _.filter(children, ((x) -> return x != child.id))
    @set('children', children);
    @save()

  tree_apply : (func, level) ->
    func(this);
    if level > 0
      newlevel = level - 1
    else if _.isNull(level)
      newlevel = null
    else
      return null
    children = @get('children')
    for childid in children
      child = @collection.get(childid)
      child.tree_apply(func, newlevel)
    return null

  toggle_todo_state : () =>
    todo_state = @get('text')
    if outline_state == 'hide_all'
      @set('outline', 'show_children')
    else if outline_state == 'show_children'
      @set('outline', 'show_all')
    else
      @set('outline', 'hide_all')
    console.log('setting', outline_state, @get('outline'))
    return null

class Efficiently.OutlineNodes extends Backbone.Collection
  model : Efficiently.OutlineNode
  url : ''

Efficiently.outlinenodes = new Efficiently.OutlineNodes()


$(() ->
  Efficiently.main_node_template = _.template($('#main-template').html())
  Efficiently.children_node_template = _.template($('#children-template').html())
)

class Efficiently.BasicNodeContentView extends BBoilerplate.BasicView
  initialize : (options) ->
    super(options)
    @viewstate = options.viewstate
    @docview = options.docview
    @render()

  delegateEvents : (events) ->
    super(events)
    BBoilerplate.safebind(this, @model, "change", @render)
    BBoilerplate.safebind(this, @viewstate, "change", @render)
    return this

  events :
    'click'  : 'select'
    'focusout' : 'unfocus'

  select : (toedit) ->
    if _.isUndefined(toedit)
      toedit = true
    @docview.select(@model, true)

  unfocus : () ->
    @model.set('text', @$el.find('.outline-input').val())
    @model.change()

  save : () ->
    if @viewstate.get('edit')
      @model.set('text', @$el.find('.outline-input').val(), {'silent' : true})
    else
      @model.set('text', @$el.find('.outline-input').val())

  render : (options) ->
    window.rendertimes += 1
    text = _.escape(@mget('text'))
    text = Efficiently.format_text(text, @model.doc)
    @$el.html(Efficiently.main_node_template(
      text : text
      chidden : @viewstate.get('any_hidden')
      edit : @viewstate.get('edit')
    ))
    if @viewstate.get('select')
      @$el.addClass("shade")
    else
      @$el.removeClass("shade")
    @$el.addClass("content clearfix")
    node = @$el.find('textarea')
    node.height(0)
    node.autoResize()
    node.val(@mget('text'))
    if @viewstate.get('edit')
      @$el.find('.outline-input').focus()
    if @viewstate.get('edit')
      _.defer((()->node.resizeNow.call(node)))
      window.setTimeout(() =>
          node.resizeNow.call(node)
        , 100
      )
    if @viewstate.get('hide')
      @$el.hide()
    else
      @$el.show()
window.rendertimes = 0
class Efficiently.BasicChildrenView extends BBoilerplate.BasicView
  initialize : (options) ->
    super(options)
    @viewstate = options.viewstate
    @docview = options.docview
    @nodeview = options.nodeview
    @views = {}
    @render()

  delegateEvents : (events) ->
    super(events)
    BBoilerplate.safebind(this, @model, "change:children", @render)
    return this
  build_views : (options) ->
    children = @model.children()
    child_refs = (model.ref() for model in children)
    BBoilerplate.build_views(@views, child_refs, (ref) =>
      @nodeview.make_view(@model.resolve_ref(ref))
    )

  render : () ->
    @build_views()
    @viewstate.set_child_viewstates(
      _.map(@views, ((x) -> return x.viewstate))
    )
    for own key, view of @views
      view.$el.detach()
    @$el.html('')
    @$el.addClass("childrenview clearfix")
    @$el.html(Efficiently.children_node_template({}))
    child_container = @$el.find('.children')
    for childid in @mget('children')
      child_container.append(@views[childid].$el)

Efficiently.format_text  = (text, document) ->
  for own key, regexp of document.state_regexp_map
    if text.match(regexp)
      color = document.get('todocolors')[key]
      html = "<span style='color:#{color}'>#{key} </span>"
      text = text.replace(regexp, html)
  return text


Efficiently.parse_text  = (text, document) ->
  data = {}
  data['text'] = text
  for own key, regexp of document.state_regexp_map
    if text.match(regexp)
      data['todo'] = key
  return data

Efficiently.set_text = (text, document, data) ->
  if not _.isUndefined(data.todo)
    if data.todo
      newval = data.todo + " "
    else
      newval = data.todo
    set = false
    for own key, regexp of document.state_regexp_map
      if text.match(regexp)
        text = text.replace(regexp, newval)
        set = true
    if not set
      text = "#{newval}#{text}"
  return text
