
/**
 * MailDev - index.js
 */

var express = require("express")
  , mailserver = require("./lib/mailserver");


// Start the Mailserver & Express

mailserver.start();

var app = module.exports = express();

app.use(express.bodyParser());
app.use(express.logger('dev'));
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
  console.log("Deleting " + id);

  if (id === "all"){
    res.send(mailserver.deleteAllMail(id));
  } else {
    res.send(mailserver.deleteMail(id));
  }
});

// Get Email HTML
app.get('/email/:id/html', function(req, res){
  res.send(mailserver.getMail(req.params.id).html);
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

app.listen(1080);
console.log("MailDev running on 127.0.0.1:1080");