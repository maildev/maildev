
/**
 * MailDev - mailserver.js
 */

var SMTPServer    = require('smtp-server').SMTPServer;
var SMTPConnection = require('smtp-connection');
var MailParser    = require('mailparser').MailParser;
var events        = require('events');
var logger        = require('./logger');
var fs            = require('fs');
var os            = require('os');
var path          = require('path');

var defaultPort   = 1025;
var defaultHost   = '0.0.0.0';
var store         = [];
var tempDir       = path.join(os.tmpdir(), 'maildev', process.pid.toString());
var eventEmitter  = new events.EventEmitter();
var smtp;


/**
 * Mail Server exports
 */

var mailServer = module.exports = {};

mailServer.store = store;


/**
 * SMTP Server stream and helper functions
 */

// Clone object
function clone(object){
  return JSON.parse(JSON.stringify(object));
}

// Create an unique id, length 8 characters
function makeId(){
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < 8; i++){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Save an email object on stream end
function saveEmail(id, envelope, mailObject){
  var object = clone(mailObject);

  object.id = id;
  object.time = new Date();
  object.read = false;
  object.envelope = envelope;
  object.source = path.join(tempDir, id + '.eml');

  store.push(object);

  logger.log('Saving email: ', mailObject.subject);

  eventEmitter.emit('new', object);
}

// Save an attachment
function saveAttachment(attachment){
  var output = fs.createWriteStream(path.join(tempDir, attachment.contentId));
  attachment.stream.pipe(output);
}

function newStream(stream, session, callback) {
  var id = makeId();

  session.saveStream = new MailParser({
    streamAttachments: true
  });
  session.saveRawStream = fs.createWriteStream(path.join(tempDir, id + '.eml'));

  stream.pipe(session.saveStream);
  stream.pipe(session.saveRawStream);

  stream.on('end', function(){
    session.saveRawStream.end();
    callback(null, 'Message queued as '+id);
  });

  session.saveStream.on('end', saveEmail.bind(null,id, {
    from: session.envelope.mailFrom,
    to: session.envelope.rcptTo,
    host: session.hostNameAppearsAs,
    remoteAddress: session.remoteAddress
  }));
  session.saveStream.on('attachment', saveAttachment);
}


/**
 * Delete everything in the temp folder
 */

function clearTempFolder(){

  fs.readdir(tempDir, function(err, files){
    if (err) throw err;

    files.forEach(function(file){
      fs.unlink( path.join(tempDir, file), function(err) {
        if (err) throw err;
      });
    });
  });
}


/**
 * Delete a single email's attachments
 */

function deleteAttachments(attachments) {

  attachments.forEach(function(attachment){
    fs.unlink( path.join(tempDir, attachment.contentId), function (err) {
      if (err) console.error(err);
    });
  });
}


/**
 * Create temp folder
 */

function createTempFolder() {

  if (fs.existsSync(tempDir)) {
    clearTempFolder();
    return;
  }

  if (!fs.existsSync(path.dirname(tempDir))) {
    fs.mkdirSync(path.dirname(tempDir));
    logger.info('Temporary directory created at %s', path.dirname(tempDir));
  }

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
    logger.info('Temporary directory created at %s', tempDir);
  }
}

/**
 * Authorize callback for smtp server
 */

function authorizeUser(auth, session, callback) {
  if (this.options.incomingUser && this.options.incomingPassword) {
    if (auth.username !== this.options.incomingUser || auth.password !== this.options.incomingPassword) {
      return callback(new Error('Invalid username or password'));
    }
  }
  callback(null, {user: this.options.incomingUser});
}


/**
 * Create and configure the mailserver
 */

mailServer.create = function(port, host, user, password) {

  // Start the server & Disable DNS checking
  smtp = new SMTPServer({
    incomingUser: user,
    incomingPassword: password,
    onAuth: authorizeUser,
    onData: newStream,
    disabledCommands: !!(user && password)?['STARTTLS']:['AUTH']
  });

  // Setup temp folder for attachments
  createTempFolder();

  mailServer.port = port || defaultPort;
  mailServer.host = host || defaultHost;
};


/**
 * Start the mailServer
 */

mailServer.listen = function(callback) {

  if (typeof callback !== 'function') callback = null;
  // Listen on the specified port
  smtp.listen(mailServer.port, mailServer.host, function(err) {
    if (err) {
      if (callback) {
        callback(err);
      } else {
        throw err;
      }
    }

    if (callback) callback();

    logger.info('MailDev SMTP Server running at %s:%s', mailServer.host, mailServer.port);
  });
};


/**
 * Stop the mailserver
 */

mailServer.end = function(done){
  smtp.close(done);
};


/**
 * Extend Event Emitter methods
 * events:
 *   'new' - emitted when new email has arrived
 */

mailServer.on                 = eventEmitter.on.bind(eventEmitter);
mailServer.emit               = eventEmitter.emit.bind(eventEmitter);
mailServer.removeListener     = eventEmitter.removeListener.bind(eventEmitter);
mailServer.removeAllListeners = eventEmitter.removeAllListeners.bind(eventEmitter);


/**
 * Get an email by id
 */

mailServer.getEmail = function(id, done){

  var email = store.filter(function(element){
    return element.id === id;
  })[0];

  if (email) {
    done(null, email);
  } else {
    done(new Error('Email was not found'));
  }
};

/**
 * Returns a readable stream of the raw email
 */

mailServer.getRawEmail = function(id, done){

  mailServer.getEmail(id, function(err, email){
    if (err) return done(err);

    done(null, fs.createReadStream( path.join(tempDir, id + '.eml') ) );

  });

};

/**
 * Get all email
 */

mailServer.getAllEmail = function(done){
  done(null, store);
};


/**
 * Delete an email by id
 */

mailServer.deleteEmail = function(id, done){
  var email      = null;
  var emailIndex = null;

  store.forEach(function(element, index){
    if (element.id === id){
      email = element;
      emailIndex = index;
    }
  });

  if (emailIndex === null){
    return done(new Error('Email not found'));
  }

  //delete raw email
  fs.unlink( path.join(tempDir, id + '.eml'), function (err) {
    if (err) console.error(err);
  });

  if (email.attachments){
    deleteAttachments(email.attachments);
  }

  logger.warn('Deleting email - %s', email.subject);

  store.splice(emailIndex, 1);

  done(null, true);
};


/**
 * Delete all emails in the store
 */

mailServer.deleteAllEmail = function(done){

  logger.warn('Deleting all email');

  clearTempFolder();
  store.length = 0;

  done(null, true);
};


/**
 * Returns the content type and a readable stream of the file
 */

mailServer.getEmailAttachment = function(id, filename, done){

  mailServer.getEmail(id, function(err, email){
    if (err) return done(err);

    if (!email.attachments || !email.attachments.length) {
      return done(new Error('Email has no attachments'));
    }

    var match = email.attachments.filter(function(attachment){
      return attachment.generatedFileName === filename;
    })[0];

    if (!match) {
      return done(new Error('Attachment not found'));
    }

    done(null, match.contentType, fs.createReadStream( path.join(tempDir, match.contentId) ) );

  });

};

/**
 * Setup outgoing
 */

mailServer.setupOutgoing = function(host, port, user, pass, secure){

  //defaults
  port = port || (secure ? 465 : 25);
  mailServer.outgoingHost = host = host || 'localhost';
  secure = secure || false;

  try {
    mailServer.client = new SMTPConnection({
      port: port,
      host: host,
      secure: secure,
      auth: (pass && user) ? { user: user, pass: pass } : false,
      tls: {rejectUnauthorized: false},
      debug: true
    });

    logger.info(
      'MailDev outgoing SMTP Server %s:%d (user:%s, pass:%s, secure:%s)',
      host,
      port,
      user,
      pass ? '####' : pass,
      secure ? 'yes' : 'no'
      );

  } catch (err){
    console.error('Error connecting to SMTP Server for outgoing email', err);
  }
};


/**
 * Relay a given email, accepts a mail id or a mail object
 */

mailServer.relayMail = function(idOrMailObject, done){
  if (!mailServer.client)
    return done(new Error('Outgoing mail not configured'));

  // If we receive a email id, get the email object
  if (typeof idOrMailObject === 'string') {
    mailServer.getEmail(idOrMailObject, function(err, email) {
      if (err) return done(err);
      mailServer.relayMail(email, done);
    });
    return;
  }

  var mail = idOrMailObject;

  mailServer.getRawEmail(mail.id, function(err, rawEmailStream){
    if (err) {
      console.error('Mail Stream Error: ', err);
      return done(err);
    }

    var mailConnectCallback = function(err, info) {
      if (err) {
        console.error('Mail Connection Error: ', err);
        return done(err);
      }

      var mailSendCallback = function(err, info) {
        mailServer.client.send({
          from: mail.envelope.from.address,
          to: mail.envelope.to.map(function(toItem) { return toItem.address; })
        }, rawEmailStream, function (err, info) {
          if (err) {
            console.error('Mail Delivery Error: ', err);
            return done(err);
          }

          logger.log('Mail Delivered: ', mail.subject);
          return done();
        });
      };

      if (mailServer.client.options.auth) {
        mailServer.client.login(mailServer.client.options.auth, mailSendCallback);
      } else {
        mailSendCallback(err, info);
      }
    };

    mailServer.client.connect(mailConnectCallback);
  });
};

/**
 * Download a given email
 */
mailServer.getEmailEml = function(id, done) {
  mailServer.getEmail(id, function(err, email){
    if (err) return done(err);

    var filename = email.id + '.eml';

    done(null, 'message/rfc822', filename, fs.createReadStream(path.join(tempDir, id + '.eml')));
  });
};
