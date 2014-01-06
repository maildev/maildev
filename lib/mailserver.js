
/**
 * MailDev - mailserver.js
 */

var simplesmtp    = require('simplesmtp')
  , MailParser    = require('mailparser').MailParser
  , events        = require('events')
  , eventEmitter  = new events.EventEmitter()
  , logger        = require('./logger')
  // , MailComposer  = require('mailcomposer').MailComposer
  // , settings      = require('./settings')
  , fs            = require('fs')
  , os            = require('os')
  , path          = require('path')
  ;

var defaultPort   = 1025
  , store         = []
  , tempDir       = path.join(os.tmpdir(), 'maildev')
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
function saveEmail(mailObject){
  var object = clone(mailObject);
  
  object.id = makeId();
  object.time = new Date();
  object.read = false;
  
  store.push(object);

  logger.log('Saving email: ', mailObject.subject);

  eventEmitter.emit('new');
}

// Save an attachment
function saveAttachment(attachment){
  var output = fs.createWriteStream(path.join(tempDir, attachment.contentId));
  attachment.stream.pipe(output);
}


// SMTP server stream functions
function newStream(connection){

  connection.saveStream = new MailParser({
    streamAttachments: true
  });
    
  connection.saveStream.on('attachment', saveAttachment);
  connection.saveStream.on('end', saveEmail);
}

function writeChunk(connection, chunk){
  connection.saveStream.write(chunk);
}

function endStream(connection, done){
  connection.saveStream.end();
  // ABC is the queue id to be advertised to the client
  // There is no current significance to this.
  done(null, 'ABC');
}


/**
 * Delete all attachments in the temp folder
 */

function deleteAllAttachments(){

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
      deleteAllAttachments();
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
  var smtp = simplesmtp.createServer({
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

  deleteAllAttachments();
  store.length = 0;

  done(null, true);
};


/**
 * Returns the content type and a readable stream of the file
 */

mailServer.getEmailAttachment = function(emailId, filename, done){

  mailServer.getEmail(emailId, function(err, email){
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
 * Setup forwarding
 */

/* NOT OPERATIONAL

function connectToClientPool(){

  settings.read(function(err, config){
    if (err) console.error(err);

    try {
      if (config.email.user && config.email.pass){
        
        // Forward Mail options
        gmailOptions = {
            name: 'Gmail'
          , secureConnection: true
          , auth: {
                user: config.email.user
              , pass: config.email.pass
            }
          , debug: true
        };
        clientPool = simplesmtp.createClientPool(465, 'smtp.gmail.com', gmailOptions);
      }
    } catch (err){
      console.error('Error connecting to SMTP Server for outgoing mail', err);
    }
  });
}

connectToClientPool();

mailServer.sendMail = function(mail){
  if (!clientPool) return;

  var newEmail = new MailComposer();
  newEmail.setMessageOption({
      from: gmailOptions.auth.user
    , to: gmailOptions.auth.user
    , subject: mail.subject
    , body: mail.body
    , html: mail.html
  });

  clientPool.sendMail(newEmail, function(err, response){
    if (err) console.error('Mail Delivery Error: ', err);
    console.log('Mail Delivered: ', mail.subject);
  });
}
*/
