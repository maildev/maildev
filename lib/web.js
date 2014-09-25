
/**
 * MailDev - web.js
 */

var express     = require('express')
  , app         = express()
  , server      = require('http').createServer(app)
  , io          = require('socket.io').listen(server)
  , pkg         = require('../package.json')
  , mailserver  = require('./mailserver')
  ;


/**
 * Exports
 */

module.exports = server;

app.use('/', express.static(__dirname + '../../app'));


/**
 * Requests
 */

// Get all emails
app.get('/email', function(req, res){

  mailserver.getAllEmail(function(err, emailList){
    if (err) return res.status(404).json([]);

    res.json(emailList);
  });

});

// Get single email
app.get('/email/:id', function(req, res){

  mailserver.getEmail( req.params.id, function(err, email){
    if (err) return res.status(404).json({ error: err.message });

     // Mark the email as 'read'
    email.read = true;

    res.json(email);
  });

});

// Delete all emails
app.delete('/email/all', function(req, res){

  mailserver.deleteAllEmail(function(err){
    if (err) return res.status(500).json({ error: err.message });

    res.json(true);
  });

});

// Delete email by id
app.delete('/email/:id', function(req, res){

  mailserver.deleteEmail(req.params.id, function(err){
    if (err) return res.status(500).json({ error: err.message });

    res.json(true);
  });

});

// Get Email HTML
app.get('/email/:id/html', function(req, res){

  mailserver.getEmail( req.params.id, function(err, email){
    if (err) return res.status(404).json({ error: err.message });

    res.send(email.html);
  });

});

// Serve Attachments
app.get('/email/:id/attachment/:filename', function(req, res){

  mailserver.getEmailAttachment(req.params.id, req.params.filename, function(err, contentType, readStream){
    if (err) return res.status(404).json('File not found');

    res.contentType(contentType);
    readStream.pipe(res);
  });

});

// Get any config settings for display
app.get('/config', function(req, res){

  res.json({
    version:  pkg.version
  , smtpPort: mailserver.port
  , outgoingHost: mailserver.outgoingHost
  });

});


// Relay the email
app.post('/email/:id/relay', function(req, res){
  mailserver.getEmail(req.params.id, function(err, email){
    if (err) return res.status(404).json({ error: err.message });

    mailserver.relayMail(email, function(err) {
      if (err) return res.status(500).json({ error: err.message });

      res.json(true);
    });

  });
});


/**
 * Socket.io
 */

function emitNewMail(socket){
  return function(){
    socket.emit('newMail', { action: 'refresh' });
  };
}

io.on('connection', function(socket){
  
  // When a new email arrives, the 'new' event will be emitted
  mailserver.on('new', emitNewMail(socket));

  socket.on('disconnect', function(){
    mailserver.removeListener('new', emitNewMail(socket));
  });

});
