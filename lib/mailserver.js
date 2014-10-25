
/**
 * MailDev - mailserver.js
 */

var simplesmtp    = require('simplesmtp')
  , MailParser    = require('mailparser').MailParser
  , events        = require('events')
  , logger        = require('./logger')
  , fs            = require('fs')
  , os            = require('os')
  , path          = require('path')
  ;

var defaultPort   = 1025
  , store         = []
  , tempDir       = path.join(os.tmpdir(), 'maildev')
  , eventEmitter  = new events.EventEmitter()
  , smtp
  ;


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
  var text = ''
    , possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    ;

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
  
  store.push(object);

  logger.log('Saving email: ', mailObject.subject);

  eventEmitter.emit('new', object);
}

// Save an attachment
function saveAttachment(attachment){
  var output = fs.createWriteStream(path.join(tempDir, attachment.contentId));
  attachment.stream.pipe(output);
}


// SMTP server stream functions
function newStream(connection){

  var id = makeId();

  connection.saveStream = new MailParser({
    streamAttachments: true
  });
  connection.saveRawStream = fs.createWriteStream(path.join(tempDir, id + '.eml'));
    
  connection.saveStream.on('attachment', saveAttachment);
  connection.saveStream.on('end', saveEmail.bind(null,id, {
    from: connection.from,
    to: connection.to,
    host: connection.host,
    remoteAddress: connection.remoteAddress
  }));
}

function writeChunk(connection, chunk){
  connection.saveStream.write(chunk);
  connection.saveRawStream.write(chunk);
}

function endStream(connection, done){
  connection.saveStream.end();
  connection.saveRawStream.end();
  // ABC is the queue id to be advertised to the client
  // There is no current significance to this.
  done(null, 'ABC');
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

function createTempFolder(){

  fs.exists(tempDir, function(exists){
    if (exists){
      clearTempFolder();
      return;
    }

    fs.mkdir(tempDir, function(err){
      if (err) throw err;

      logger.info('Temporary directory created at %s', tempDir);
    });

  });
}


/**
 * Start the mailServer
 */

mailServer.listen = function(port){

  // Start the server & Disable DNS checking
  smtp = simplesmtp.createServer({
    disableDNSValidation: true
  });

  // Setup temp folder for attachments
  createTempFolder();

  mailServer.port = port || defaultPort;

  // Listen on the specified port
  smtp.listen(port, function(err){
    if (err) throw err;
    logger.info('MailDev SMTP Server running at 127.0.0.1:%s', mailServer.port);
  });

  // Bind events to stream
  smtp.on('startData', newStream);
  smtp.on('data',      writeChunk);
  smtp.on('dataReady', endStream);
};

/**
 * Stop the mailserver
 */

mailServer.end = function(done){
  smtp.end(done);
};


/**
 * Extend Event Emitter methods
 * events:
 *   'new' - emitted when new email has arrived
 */

mailServer.on             = eventEmitter.on.bind(eventEmitter);
mailServer.emit           = eventEmitter.emit.bind(eventEmitter);
mailServer.removeListener = eventEmitter.removeListener.bind(eventEmitter);


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
  var email      = null
    , emailIndex = null;

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
     
    // Forward Mail options
    var options = {
        secureConnection: secure
      , debug: true
      };

    if(pass && user) {
      options.auth = {
        user: user,
        pass: pass
      };
    }


    mailServer.clientPool = simplesmtp.createClientPool(port, host, options);

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
  if (!mailServer.clientPool)
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

    //simplesmtp accepts a "MailComposer compatible" object
    var mailComposer = rawEmailStream;
    mailComposer.getEnvelope = function(){
      return mail.envelope;
    };
    mailComposer.streamMessage = function(){
      //noop
    };

    mailServer.clientPool.sendMail(mailComposer, function(err, response){
      if (err) {
        console.error('Mail Delivery Error: ', err);
        return done(err);
      }

      logger.log('Mail Delivered: ', mail.subject);
      done();
    });

  });
};
