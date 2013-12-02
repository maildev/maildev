
/**
 * MailDev - index.js
 *
 * Author: Dan Farrelly <daniel.j.farrelly@gmail.com>
 * Licensed under the MIT License.
 */

var express     = require('express')
  , app         = express()
  , server      = require('http').createServer(app)
  , io          = require('socket.io').listen(server)
  , mailserver  = require('./lib/mailserver')
  , fs          = require('fs')
  ;


// Start the Mailserver & Express

mailserver.start();

module.exports = app;

app.use(express.json());
app.use(express.urlencoded());
app.use('/', express.static(__dirname + '/app'));


// Requests :::::::::::::::::::::::::::::::::::::::::::::::::::::::

// Get all emails
app.get('/email', function(req, res){
  res.json( mailserver.getAllMail() );
});

// Get single email
app.get('/email/:id', function(req, res){
  var mail = mailserver.getMail(req.params.id);
  if (mail){
    mail.read = true;
    res.json(mail);
  } else {
    res.send(404, false);
  }
});

// Delete emails
app.delete('/email/:id', function(req, res){
  var id = req.params.id;

  if (id === 'all'){
    res.send(mailserver.deleteAllMail(id));
  } else {
    res.send(mailserver.deleteMail(id));
  }
});

// Get Email HTML
app.get('/email/:id/html', function(req, res){
  res.send(mailserver.getMail(req.params.id).html);
});

// Serve Attachments
app.get('/email/:id/attachment/:filename', function(req, res){

  mailserver.getAttachmentInfo(req.params.id, req.params.filename, function(err, attachment){
    if (err) return res.json(404, 'File not found');

    res.contentType(attachment.contentType);
    mailserver.attachmentReadStream(attachment).pipe(res);
  });

});

/*
// Forward the email
app.post('/email/:id/send', function(req, res){
  try {
    var mail = mailserver.getMail(req.params.id);
    mailserver.sendMail(mail);
    res.json(true);
  } catch (err){
    console.log(err);
    res.json(500, err);
  }
});
*/

// Socket.io :::::::::::::::::::::::::::::::::::::::::::::::::::::::

io.configure(function(){
  io.set('log level', 0);
});

function emitNewMail(socket){
  return function(){
    socket.emit('newMail', { hello: 'world' });
  };
}

io.sockets.on('connection', function(socket){
  
  // When a new email arrives, the 'new' event will be emitted
  mailserver.eventEmitter.on('new', emitNewMail(socket));

  socket.on('disconnect', function(){
    mailserver.eventEmitter.removeListener('new', emitNewMail(socket));
  });

});


server.listen(1080);
console.log('MailDev app running at 127.0.0.1:1080');