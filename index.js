
/**
 * MailDev - index.js
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

app.use(express.bodyParser());
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
  console.log('Deleting ' + id);

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

// Serve Attachements
app.get('/attachment/:msgId/:filename', function(req, res){
    try {
        // get mail by id
        var mail = mailserver.getMail(req.params.msgId);
        var attachment = null;
        // get the attachment we want by its generatedFileName (unique)
        mail.attachments.forEach(function(a){
            if(a.generatedFileName == req.params.filename){
                attachment = a;
            }
        });
       
        // if attachment is available
        if(attachment){
            // try to read and serve it
            fs.readFile('tmp/'+attachment.contentId,function(err,data){
                if(err) {
                    console.log(err)
                }
                res.contentType(attachment.contentType);
                res.end(data);
            });
        } else {
            // the attachment is not available
            res.json(404, 'File not found');    
        }
    } catch (err) {
        console.log(err);
        res.json(404, 'File not found');
    }
    
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

io.sockets.on('connection', function(socket){
  
  // When a new email arrives, the 'new' event will be emitted
  mailserver.eventEmitter.on('new', function(){
    socket.emit('newMail', { hello: 'world' });
  });

});


server.listen(1080);
console.log('MailDev app running at 127.0.0.1:1080');