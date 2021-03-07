'use strict'

/**
 * MailDev - mailserver.js
 */

const SMTPServer = require('smtp-server').SMTPServer
const MailParser = require('mailparser-mit').MailParser
const events = require('events')
const fs = require('fs')
const os = require('os')
const path = require('path')
const rimraf = require('rimraf')
const utils = require('./utils')
const logger = require('./logger')
const smtpHelpers = require('./helpers/smtp')
const outgoing = require('./outgoing')
const stripTags = require('strip-tags')

const defaultPort = 1025
const defaultHost = '0.0.0.0'
const store = []
const defaultMailDir = path.join(os.tmpdir(), 'maildev', process.pid.toString())
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

// format bytes
// https://stackoverflow.com/a/18650828/3143704
function formatBytes (bytes, decimals = 2) {
  if (bytes === 0) return '0 bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Save an email object on stream end
function saveEmail (id, isRead = false, envelope, mailObject) {
  // remove stream object from attachments (fix the JSON.stringify)
  if (mailObject.attachments instanceof Array) {
    mailObject.attachments.forEach(function (attachment) {
      delete attachment.stream
    })
  }

  var object = clone(mailObject)

  object.id = id
  object.time = mailObject.date ? mailObject.date : new Date()
  object.read = isRead
  object.envelope = envelope
  object.source = path.join(mailServer.mailDir, id + '.eml')

  var stat = fs.statSync(object.source)
  object.size = stat.size
  object.sizeHuman = formatBytes(object.size)

  store.push(object)

  logger.log('Saving email: %s, id: %s', mailObject.subject, id)

  if (outgoing.isAutoRelayEnabled()) {
    mailServer.relayMail(object, true, function (err) {
      if (err) logger.error('Error when relaying email', err)
    })
  }

  eventEmitter.emit('new', object)
}

// Save an attachment
function saveAttachment (id, attachment) {
  if (!fs.existsSync(path.join(mailServer.mailDir, id))) {
    fs.mkdirSync(path.join(mailServer.mailDir, id))
  }
  var output = fs.createWriteStream(path.join(mailServer.mailDir, id, attachment.contentId))
  attachment.stream.pipe(output)
}

function createSaveStream (id, envelope) {
  var parseStream = new MailParser({
    streamAttachments: true
  })
  parseStream.on('end', saveEmail.bind(null, id, false, envelope))
  parseStream.on('attachment', saveAttachment.bind(null, id))
  return parseStream
}

function createRawStream (id) {
  return fs.createWriteStream(path.join(mailServer.mailDir, id + '.eml'))
}

function handleDataStream (stream, session, callback) {
  const id = utils.makeId()

  session.saveStream = createSaveStream(id, {
    from: session.envelope.mailFrom,
    to: session.envelope.rcptTo,
    host: session.hostNameAppearsAs,
    remoteAddress: session.remoteAddress
  })

  session.saveRawStream = createRawStream(id)

  stream.pipe(session.saveStream)
  stream.pipe(session.saveRawStream)

  stream.on('end', function () {
    session.saveRawStream.end()
    callback(null, 'Message queued as ' + id)
  })
}

/**
 * Delete everything in the mail directory
 */
function clearMailDir () {
  fs.readdir(mailServer.mailDir, function (err, files) {
    if (err) throw err

    files.forEach(function (file) {
      rimraf(path.join(mailServer.mailDir, file), function (err) {
        if (err) throw err
      })
    })
  })
}

/**
 * Create mail directory
 */

function createMailDir () {
  if (!fs.existsSync(path.dirname(mailServer.mailDir))) {
    fs.mkdirSync(path.dirname(mailServer.mailDir))
    logger.log('Mail directory created at %s', path.dirname(mailServer.mailDir))
  }

  if (!fs.existsSync(mailServer.mailDir)) {
    fs.mkdirSync(mailServer.mailDir)
    logger.log('Mail directory created at %s', mailServer.mailDir)
  }
}

/**
 * Create and configure the mailserver
 */

mailServer.create = function (port, host, mailDir, user, password, hideExtensions) {
  const hideExtensionOptions = getHideExtensionOptions(hideExtensions)
  const smtpServerConfig = Object.assign({
    onAuth: smtpHelpers.createOnAuthCallback(user, password),
    onData: handleDataStream,
    logger: false,
    hideSTARTTLS: true,
    disabledCommands: (user && password) ? ['STARTTLS'] : ['AUTH']
  }, hideExtensionOptions)

  const smtp = new SMTPServer(smtpServerConfig)

  smtp.on('error', mailServer.onSmtpError)

  mailServer.mailDir = mailDir || defaultMailDir
  createMailDir()

  mailServer.port = port || defaultPort
  mailServer.host = host || defaultHost

  // testability requires this to be exposed.
  // otherwise we cannot test whether error handling works
  mailServer.smtp = smtp
}

const HIDEABLE_EXTENSIONS = [
  'STARTTLS', // Keep it for backward compatibility, but is overriden by hardcoded `hideSTARTTLS`
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
  process.emit('SIGTERM')
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
    if (email.html) {
      email.html = stripTags(email.html, ['script'])
    }
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

    done(null, fs.createReadStream(path.join(mailServer.mailDir, id + '.eml')))
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
      return (baseUrl || '') + '/email/' + id + '/attachment/' + encodeURIComponent(filename)
    }

    if (embeddedAttachments.length) {
      embeddedAttachments.forEach(function (attachment) {
        var regex = new RegExp('src=("|\')cid:' + attachment.contentId + '("|\')', 'g')
        var replacement = 'src="' + getFileUrl(id, baseUrl, attachment.generatedFileName) + '"'
        html = html.replace(regex, replacement)
      })
    }

    done(null, html)
  })
}

/**
 * Read single email
 */

// mailServer.readEmail = function (id, done) {
//  var email = store.filter(function (element) {
//    return element.id === id
//  })[0]
//  if (email) {
//    email.read  = true
//    done(null, email)
//  } else {
//    done(new Error('Email was not found'))
//  }
// }

/**
 * Read all emails
 */

mailServer.readAllEmail = function (done) {
  const allUnread = store.filter(function (element) {
    return !element.read
  })
  for (const email of allUnread) {
    email.read = true
  }
  done(null, allUnread.length)
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
  fs.unlink(path.join(mailServer.mailDir, id + '.eml'), function (err) {
    if (err) {
      logger.error(err)
    } else {
      eventEmitter.emit('delete', { id: id, index: emailIndex })
    }
  })

  if (email.attachments) {
    rimraf(path.join(mailServer.mailDir, id), function (err) {
      if (err) throw err
    })
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

  clearMailDir()
  store.length = 0
  eventEmitter.emit('delete', { id: 'all' })

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

    var match = email.attachments.filter(function (attachment) {
      return attachment.generatedFileName === filename
    })[0]

    if (!match) {
      return done(new Error('Attachment not found'))
    }

    done(null, match.contentType, fs.createReadStream(path.join(mailServer.mailDir, id, match.contentId)))
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

mailServer.setAutoRelayMode = function (enabled, rules, emailAddress) {
  outgoing.setAutoRelayMode(enabled, rules, emailAddress)
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

    done(null, 'message/rfc822', filename, fs.createReadStream(path.join(mailServer.mailDir, id + '.eml')))
  })
}

mailServer.loadMailsFromDirectory = function () {
  var persistencePath = fs.realpathSync(mailServer.mailDir)
  fs.readdir(persistencePath, function (err, files) {
    if (err) {
      logger.error('Error during reading of the mailDir %s', persistencePath)
    } else {
      store.length = 0
      files.forEach(function (file) {
        var filePath = persistencePath + '/' + file
        if (path.parse(file).ext === '.eml') {
          fs.readFile(filePath, 'utf8', function (err, data) {
            if (err) {
              logger.error('Error during reading of the file %s', filePath)
            } else {
              var idMail = path.parse(file).name
              var parseStream = new MailParser({
                streamAttachments: true
              })
              logger.log('Restore mail %s', idMail)
              var envelope = { from: '', to: '', host: 'undefined', remoteAddress: 'undefined' }
              parseStream.on('from', function (from) {
                envelope.from = from
              })
              parseStream.on('to', function (to) {
                envelope.to = to
              })
              parseStream.on('end', saveEmail.bind(null, idMail, true, envelope))
              parseStream.on('attachment', saveAttachment.bind(null, idMail))
              parseStream.write(data)
              parseStream.end()
            }
          })
        }
      })
    }
  })
}
