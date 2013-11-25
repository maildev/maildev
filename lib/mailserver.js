
/**
 * MailDev - mailserver.js
 */

var simplesmtp    = require('simplesmtp')
  , MailParser    = require('mailparser').MailParser
  , events        = require('events')
  , eventEmitter  = new events.EventEmitter()
  , MailComposer  = require('mailcomposer').MailComposer
  , settings      = require('./settings')
  , fs            = require('fs')
  ;

var port          = 1025
  , store         = []
  , clientPool
  , gmailOptions
  ;


/**
 * Mail Server exports
 */

var mailServer = module.exports = {};

mailServer.store = store;

fs.mkdir('tmp',function(err){
    if(err) {
        if(err.code == 'EEXIST'){
            console.log('skipped creating tmp directory');    
        } else {
            console.error(err);    
        }
    } else {
        console.log('created tmp directory for attachments');   
    }
});
deleteAllAttachments();



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
  console.log('Saving email: ', mailObject.subject);

  eventEmitter.emit('new');
}


// SMTP server stream functions
function newStream(connection){
  try {
    connection.saveStream = new MailParser({
        streamAttachments: true
    });
  } catch (err){
    console.error(err);
  }
    
  try {
      connection.saveStream.on("attachment", function(attachment){
          var output = fs.createWriteStream('tmp/'+attachment.contentId);
          attachment.stream.pipe(output);
      });
  } catch (err) {
      console.error(err);
  }

  try {
    connection.saveStream.on('end', saveEmail);
  } catch (err){
    console.error(err);
  }
    
}

function writeChunk(connection, chunk){
  connection.saveStream.write(chunk);
}

function endStream(connection, callback){
  connection.saveStream.end();
  // ABC is the queue id to be advertised to the client
  // There is no current significance to this.
  callback(null, 'ABC');
}

function deleteAllAttachments(){
    var gotError = false;
    fs.readdir('tmp', function(err, files){
        files.forEach(function(file){
            fs.unlink('tmp/'+file, function(err) {
                if (err) {
                    console.error( err );
                    gotError = true;
                }
            
            });
        });
        if (err) console.error( err );
    });
    if (!gotError)
        console.log('emptied tmp');
    
}

function deleteAttachments(id)  {
    var mail = store[id];
    mail.attachments.forEach(function(attachment){
        fs.unlink('tmp/'+attachment.contentId, function (err) {
            if (err) console.error( err );
            console.log('successfully deleted tmp/'+attachment.contentId);
        });
    })
}



/**
 * Start the mailServer
 */

mailServer.start = function(){
  // Start the server & Disable DNS checking
  var smtp = simplesmtp.createServer({
    disableDNSValidation: true
  });

  // Listen on the specified port
  smtp.listen(port, function(err){
    if (err) throw err;
    console.log('MailDev SMTP Server running at 127.0.0.1:' + port);
  });

  // Bind events to stream
  smtp.on('startData', newStream);
  smtp.on('data', writeChunk);
  smtp.on('dataReady', endStream);
};

/**
 * Event Emitter
 * events:
 *   'new' - emitted when new email has arrived
 */
mailServer.eventEmitter = eventEmitter;


/**
 * Get an email by id
 */

mailServer.getMail = function(id){
  return store.filter(function(element, index, array){
    return element.id === id;
  })[0];
};


/**
 * Get all email
 */

mailServer.getAllMail = function(){
  return store;
};


/**
 * Delete an email by id
 */

mailServer.deleteMail = function(id){
  var mailIndex = null;

  store.forEach(function(element, index, array){
    if (element.id === id){
      mailIndex = index;
    }
  });

  if (mailIndex !== null){
    deleteAttachments(mailIndex);  
    store.splice(mailIndex, 1);
    return true;
  } else {
    return false;
  }
};


/**
 * Delete all emails in the store
 */

mailServer.deleteAllMail = function(){
  deleteAllAttachments();
  store.length = 0;
  return true;
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
