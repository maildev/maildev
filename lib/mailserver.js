'use strict'

/**
 * MailDev - mailserver.js
 */

const SMTPServer = require('smtp-server').SMTPServer
const simpleParser = require('mailparser').simpleParser
const events = require('events')
const fs = require('fs')
const os = require('os')
const path = require('path')
const logger = require('./logger')
const outgoing = require('./outgoing')

const defaultPort = 1025
const defaultHost = '0.0.0.0'
const store = []
const tempDir = path.join(os.tmpdir(), 'maildev', process.pid.toString())
const eventEmitter = new events.EventEmitter()

/**
 * Mail Server exports
 */

const mailServer = module.exports = {}

mailServer.store = store

/**
 * SMTP Server stream and helper functions
 */

// Clone object
function clone (object) {
  return JSON.parse(JSON.stringify(object))
}

// Create an unique id, length 8 characters
function makeId () {
  var text = ''
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (var i = 0; i < 8; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

function getAttachmentFilenameOnDisk (attachment) {
  return path.join(tempDir, attachment.checksum)
}

function saveAttachment (attachment) {
  const content = attachment.content
  delete attachment.content
  const filename = getAttachmentFilenameOnDisk(attachment)
  fs.writeFile(filename, content, function (err) {
    if (err) {
      logger.error(`Could not save attachment: ${attachment.filename}`, err)
    }
  })
}

function getEmailHeaders (headersMap) {
  const keys = []
  for (let key of headersMap.keys()) {
    keys.push(key)
  }
  return keys
    .filter(key => typeof headersMap.get(key) === 'string')
    .reduce((headers, key) => {
      headers[key] = headersMap.get(key)
      return headers
    }, {})
}

// Save an email object on stream end
function saveEmail (id, envelope, rawEmail) {
  rawEmail.attachments.forEach(saveAttachment)

  const email = clone(rawEmail)

  // transform fields
  email.from = email.from && email.from.value
  email.to = email.to && email.to.value
  email.headers = getEmailHeaders(rawEmail.headers)

  // append fields
  email.id = id
  email.time = new Date()
  email.read = false
  email.envelope = envelope
  email.source = path.join(tempDir, `${id}.eml`)

  store.push(email)

  logger.log('Saving email: ', email.subject)

  if (outgoing.isAutoRelayEnabled()) {
    mailServer.relayMail(email, true, function (err) {
      if (err) logger.error('Error when relaying email', err)
    })
  }

  eventEmitter.emit('new', email)
}

function createRawStream (id) {
  return fs.createWriteStream(path.join(tempDir, id + '.eml'))
}

function handleDataStream (stream, session, callback) {
  const id = makeId()
  const envelope = {
    from: session.envelope.mailFrom,
    to: session.envelope.rcptTo,
    host: session.hostNameAppearsAs,
    remoteAddress: session.remoteAddress
  }

  const saveRawStream = createRawStream(id)
  stream.pipe(saveRawStream)

  const chunks = []
  stream.on('data', function (data) {
    chunks.push(data)
  })

  stream.on('end', function () {
    saveRawStream.end()
    const source = Buffer.concat(chunks)
    simpleParser(source, function (err, mail) {
      saveEmail(id, envelope, mail)
      callback(err, `Message queued as ${id}`)
    })
  })
}

/**
 * Delete everything in the temp folder
 */

function clearTempFolder () {
  fs.readdir(tempDir, function (err, files) {
    if (err) throw err

    files.forEach(function (file) {
      fs.unlink(path.join(tempDir, file), function (err) {
        if (err) throw err
      })
    })
  })
}

/**
 * Delete a single email's attachments
 */

function deleteAttachments (attachments) {
  attachments.forEach(function (attachment) {
    fs.unlink(path.join(tempDir, attachment.contentId), function (err) {
      if (err) logger.error(err)
    })
  })
}

/**
 * Create temp folder
 */

function createTempFolder () {
  if (fs.existsSync(tempDir)) {
    clearTempFolder()
    return
  }

  if (!fs.existsSync(path.dirname(tempDir))) {
    fs.mkdirSync(path.dirname(tempDir))
    logger.log('Temporary directory created at %s', path.dirname(tempDir))
  }

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
    logger.log('Temporary directory created at %s', tempDir)
  }
}

/**
 * Authorize callback for smtp server
 */

function authorizeUser (auth, session, callback) {
  var username = auth.username
  var password = auth.password

  if (this.options.incomingUser && this.options.incomingPassword) {
    if (username !== this.options.incomingUser ||
        password !== this.options.incomingPassword) {
      return callback(new Error('Invalid username or password'))
    }
  }
  callback(null, { user: this.options.incomingUser })
}

/**
 * Create and configure the mailserver
 */

mailServer.create = function (port, host, user, password, hideExtensions) {
  const hideExtensionOptions = getHideExtensionOptions(hideExtensions)
  const smtpServerConfig = Object.assign({
    incomingUser: user,
    incomingPassword: password,
    onAuth: authorizeUser,
    onData: handleDataStream,
    logger: false,
    disabledCommands: (user && password) ? ['STARTTLS'] : ['AUTH']
  }, hideExtensionOptions)

  const smtp = new SMTPServer(smtpServerConfig)

  smtp.on('error', mailServer.onSmtpError)

  // Setup temp folder for attachments
  createTempFolder()

  mailServer.port = port || defaultPort
  mailServer.host = host || defaultHost

  // testability requires this to be exposed.
  // otherwise we cannot test whether error handling works
  mailServer.smtp = smtp
}

const HIDEABLE_EXTENSIONS = [
  'STARTTLS',
  'PIPELINING',
  '8BITMIME',
  'SMTPUTF8'
]

function getHideExtensionOptions (extensions) {
  if (!extensions) {
    return {}
  }
  return extensions.reduce(function (options, extension) {
    const ext = extension.toUpperCase()
    if (HIDEABLE_EXTENSIONS.indexOf(ext) > -1) {
      options[`hide${ext}`] = true
    } else {
      throw new Error(`Invalid hideable extension: ${ext}`)
    }
    return options
  }, {})
}

/**
 * Start the mailServer
 */

mailServer.listen = function (callback) {
  if (typeof callback !== 'function') callback = null

  // Listen on the specified port
  mailServer.smtp.listen(mailServer.port, mailServer.host, function (err) {
    if (err) {
      if (callback) {
        callback(err)
      } else {
        throw err
      }
    }

    if (callback) callback()

    logger.info('MailDev SMTP Server running at %s:%s', mailServer.host, mailServer.port)
  })
}

mailServer.onSmtpError = function (e) {
  logger.info(
    `Could not start mail server on ${e.address}:${e.port}\n` +
    `Port already in use or insufficient rights to bind port`
  )
  mailServer.close()
}

/**
 * Stop the mailserver
 */

mailServer.close = function (callback) {
  mailServer.emit('close')
  mailServer.smtp.close(callback)
  outgoing.close()
}

/**
 * Extend Event Emitter methods
 * events:
 *   'new' - emitted when new email has arrived
 */

mailServer.on = eventEmitter.on.bind(eventEmitter)
mailServer.once = eventEmitter.once.bind(eventEmitter)
mailServer.emit = eventEmitter.emit.bind(eventEmitter)
mailServer.removeListener = eventEmitter.removeListener.bind(eventEmitter)
mailServer.removeAllListeners = eventEmitter.removeAllListeners.bind(eventEmitter)

/**
 * Get an email by id
 */

mailServer.getEmail = function (id, done) {
  var email = store.filter(function (element) {
    return element.id === id
  })[0]

  if (email) {
    done(null, email)
  } else {
    done(new Error('Email was not found'))
  }
}

/**
 * Returns a readable stream of the raw email
 */

mailServer.getRawEmail = function (id, done) {
  mailServer.getEmail(id, function (err, email) {
    if (err) return done(err)

    done(null, fs.createReadStream(path.join(tempDir, id + '.eml')))
  })
}

/**
 * Returns the html of a given email
 */

mailServer.getEmailHTML = function (id, baseUrl, done) {
  if (!done && typeof baseUrl === 'function') {
    done = baseUrl
    baseUrl = null
  }

  if (baseUrl) { baseUrl = '//' + baseUrl }

  mailServer.getEmail(id, function (err, email) {
    if (err) return done(err)

    var html = email.html

    if (!email.attachments) { return done(null, html) }

    var embeddedAttachments = email.attachments.filter(function (attachment) {
      return attachment.contentId
    })

    var getFileUrl = function (id, baseUrl, filename) {
      return (baseUrl || '') + '/email/' + id + '/attachment/' + filename
    }

    if (embeddedAttachments.length) {
      embeddedAttachments.forEach(function (attachment) {
        var regex = new RegExp('src=("|\')cid:' + attachment.contentId + '("|\')', 'g')
        var replacement = 'src="' + getFileUrl(id, baseUrl, attachment.filename) + '"'
        html = html.replace(regex, replacement)
      })
    }

    done(null, html)
  })
}

/**
 * Get all email
 */

mailServer.getAllEmail = function (done) {
  done(null, store)
}

/**
 * Delete an email by id
 */

mailServer.deleteEmail = function (id, done) {
  var email = null
  var emailIndex = null

  store.forEach(function (element, index) {
    if (element.id === id) {
      email = element
      emailIndex = index
    }
  })

  if (emailIndex === null) {
    return done(new Error('Email not found'))
  }

  // delete raw email
  fs.unlink(path.join(tempDir, id + '.eml'), function (err) {
    if (err) {
      logger.error(err)
    } else {
      eventEmitter.emit('delete', {id: id, index: emailIndex})
    }
  })

  if (email.attachments) {
    deleteAttachments(email.attachments)
  }

  logger.warn('Deleting email - %s', email.subject)

  store.splice(emailIndex, 1)

  done(null, true)
}

/**
 * Delete all emails in the store
 */

mailServer.deleteAllEmail = function (done) {
  logger.warn('Deleting all email')

  clearTempFolder()
  store.length = 0
  eventEmitter.emit('delete', {id: 'all'})

  done(null, true)
}

/**
 * Returns the content type and a readable stream of the file
 */

mailServer.getEmailAttachment = function (id, filename, done) {
  mailServer.getEmail(id, function (err, email) {
    if (err) return done(err)

    if (!email.attachments || !email.attachments.length) {
      return done(new Error('Email has no attachments'))
    }

    const attachment = email.attachments.filter(function (attachment) {
      return attachment.filename === filename
    })[0]

    if (!attachment) {
      return done(new Error('Attachment not found'))
    }

    done(null, attachment.contentType, fs.createReadStream(getAttachmentFilenameOnDisk(attachment)))
  })
}

/**
 * Setup outgoing
 */
mailServer.setupOutgoing = function (host, port, user, pass, secure) {
  outgoing.setup(host, port, user, pass, secure)
}

mailServer.isOutgoingEnabled = function () {
  return outgoing.isEnabled()
}

mailServer.getOutgoingHost = function () {
  return outgoing.getOutgoingHost()
}

/**
 * Set Auto Relay Mode, automatic send email to recipient
 */

mailServer.setAutoRelayMode = function (enabled, rules) {
  outgoing.setAutoRelayMode(enabled, rules)
}

/**
 * Relay a given email, accepts a mail id or a mail object
 */

mailServer.relayMail = function (idOrMailObject, isAutoRelay, done) {
  if (!outgoing.isEnabled()) { return done(new Error('Outgoing mail not configured')) }

  // isAutoRelay is an option argument
  if (typeof isAutoRelay === 'function') {
    done = isAutoRelay
    isAutoRelay = false
  }

  // If we receive a email id, get the email object
  if (typeof idOrMailObject === 'string') {
    mailServer.getEmail(idOrMailObject, function (err, email) {
      if (err) return done(err)
      mailServer.relayMail(email, done)
    })
    return
  }

  var mail = idOrMailObject

  mailServer.getRawEmail(mail.id, function (err, rawEmailStream) {
    if (err) {
      logger.error('Mail Stream Error: ', err)
      return done(err)
    }

    outgoing.relayMail(mail, rawEmailStream, isAutoRelay, done)
  })
}

/**
 * Download a given email
 */
mailServer.getEmailEml = function (id, done) {
  mailServer.getEmail(id, function (err, email) {
    if (err) return done(err)

    var filename = email.id + '.eml'

    done(null, 'message/rfc822', filename, fs.createReadStream(path.join(tempDir, id + '.eml')))
  })
}
