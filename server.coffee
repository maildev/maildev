express = require "express"
mailserver = require "./mailserver.coffee"

# Start the Mailserver & start catching emails
mailserver.start()
mailStore = mailserver.store

# Webserver shit
app = module.exports = express()

app.configure( ->
  app.use(express.bodyParser())
)

# Grab the last argument off the command line
# process.argv returns array of command line args
# i.e. `$ coffee server.coffee dev` returns  ['coffee', 'server.coffee', 'dev']

arg = process.argv.pop()

if arg.toLowerCase() == '--dev'
  console.log "Running in Development mode.  Also run 'grunt watch'."
  app.configure('development', ->
    app.use(express.logger('dev'))
    app.use('/', express.static(__dirname + '/.tmp'))
    app.use('/', express.static(__dirname + '/app'))
  )
else
  app.configure('development', ->
    app.use('/', express.static(__dirname + '/dist'))
  )

# Get mail by ID
getMail = (id) ->
  return mailStore.filter( (element, index, array) ->
    return element.id == id
  )[0]

deleteMail = (id) ->
  mailIndex = null
  mailStore.forEach( (element, index, array) ->
    mailIndex = index if element.id == id
    element.id
  )
  if mailIndex != null
    mailStore.splice(mailIndex, 1)
    return true
  else
    return false

deleteAllMail = ->
  mailStore.length = 0
  return true



# Requests :::::::::::::::::::::::::::::::::::::::::::::::::::::::

# Get all emails
app.get('/email', (req, res, next) ->
  res.json( mailStore )
)

# Get single email
app.get('/email/:id', (req, res, next) ->
  id = req.params.id
  mail = getMail(id)
  if mail
    mail.read = true
    res.json( mail )
  else
    res.send(404, false )
)

# Delete emails
app.delete('/email/:id', (req, res, next) ->

  id = req.params.id
  console.log "Deleting #{id}"

  if id == "all"
    res.send( deleteAllMail(id) )
  else
    res.send( deleteMail(id) )
)

# Get Email HTML
app.get('/email/:id/html', (req, res, next) ->
  id = req.params.id
  res.send( getMail(id).html )
)

# Forwrad the email
app.post('/email/:id/send', (req, res, next) ->
  id = req.params.id

  try
    mail = getMail(id)
    mailserver.sendMail(mail)
    res.json true
  catch err
    console.log err
    res.json 500, err
)


serverPort = 1080
app.listen(serverPort)
console.log "Listening on port #{serverPort}"