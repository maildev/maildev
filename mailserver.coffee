simplesmtp = require "simplesmtp"
MailComposer = require("mailcomposer").MailComposer
MailParser = require("mailparser").MailParser

exports.store = mailStore = []
tempMailStream = new MailParser()
port = 1025


# Testing sending email
# pool = simplesmtp.pool

gmailOptions =
  name: 'Gmail'
  secureConnection: true
  auth:
    user: 'daniel.j.farrelly@gmail.com'
    pass: 'patapsco53'
  debug: true


pool = simplesmtp.createClientPool(465, 'smtp.gmail.com', gmailOptions)

console.log "pool", pool

exports.sendMail = (mail) ->

  # Create a new mailcomposer object
  newEmail = new MailComposer()
  newEmail.setMessageOption(
    from: gmailOptions.auth.user
    to: gmailOptions.auth.user
    subject: mail.subject
    body: mail.body
    html: mail.html
    )
  
  sending = pool.sendMail(newEmail, (err, responseObj) ->
    if err
      console.error "Mail Delivery Error: ", err
    else
      console.log "Mail Delivered: ", mail.subject
    )
  return true


exports.start = ->
  # Start the server & Disable DNS checking
  smtp = simplesmtp.createServer(
    disableDNSValidation: true
  )
  smtp.listen(port, (err) ->
    if not err
      console.log "Maildev running on 127.0.0.1:#{port}"
    else
      console.error "SMTP Server Error: ", err.message
  )
  

  # v2
  smtp.on("startData", (connection) ->

    try 
      connection.saveStream = new MailParser()
    catch e
      console.error e

    try 
      connection.saveStream.on("end", (mail_object) ->
        
        object = clone(mail_object)
        object.id = makeId()
        object.time = new Date()
        object.read = false

        mailStore.push(clone(object))
        console.log "Saving email... ", object.subject
      )
    catch e
      console.error e
  )

  smtp.on("data", (connection, chunk) ->
    connection.saveStream.write(chunk)
  )

  smtp.on("dataReady", (connection, callback) ->
    connection.saveStream.end()
    console.log("Incoming message saved")
    callback(null, "ABC1") # ABC1 is the queue id to be advertised to the client
    # callback(new Error("Rejected as spam!")) // reported back to the client
  )

makeId = (length = 8) ->
  text = "";
  possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for i in [length...0]
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;


clone = (obj) ->
  return JSON.parse(JSON.stringify(obj))

''' NOT USED '''

# So we don't store more than 20 emails
trimArray = (array) ->
  if array.length > 20
    array.shift()
    return trimArray(array)
  else
    return array

# Add the index of the item to the item itself
indexData = (array) ->
  # Check if data is too big and remove some
  array = trimArray(array)

  for item, i in array
    item.id = i
