# API

MailDev provides an API to use in your Node.js applications.

## Basic usage example

```javascript
var MailDev = require('maildev');

var maildev = new MailDev({
  smtp: 1025 // incoming SMTP port - default is 1025
});

maildev.listen(function(err) {
  console.log('We can now sent emails to port 1025!');
});

// Print new emails to the console as they come in
maildev.on('new', function(email){
  console.log('Received new email with subject: %s', email.subject);
});

// Get all emails
maildev.getAllEmail(function(err, emails){
  if (err) return console.log(err);
  console.log('There are %s emails', emails.length);
});
```

## Relay emails

MailDev can relay a given email to the given "to" address. This example will
relay every email sent to "johnny.utah@fbi.gov": 

```javascript
var MailDev = require('maildev');

var maildev = new MailDev({
  outgoingHost: 'smtp.gmail.com',
  outgoingUser: 'test@gmail.com',
  outgoingPass: '********'
});

maildev.listen();

// Print new emails to the console as they come in
maildev.on('new', function(email){
  
  if (email.to.address === 'johnny.utah@fbi.gov') {

    maildev.relayMail(email, function(err){
      if (err) return console.log(err);

      console.log('Email has been relayed!');

    });

  }

});
```

## API methods

*All callbacks follow the Node error-first pattern, ex.* `function(err, data){...`

**listen(callback)** - Starts the smtp server 

**end(callback)** - Stops the smtp server

**on('new', callback)** - Event called when a new email is received. Callback 
receives single mail object.

**getEmail(id, callback)** - Accepts email id, returns email object

**getRawEmail(id, callback)** - Returns a readable stream of the raw email

**getAllEmail(callback)** - Returns array of all email

**deleteEmail(id, callback)** - Deletes a given email by id

**deleteAllEmail(callback)** - Deletes all email and their attachments

**getEmailAttachment(id, filename, callback)** - Returns the content type and a 
readable stream of the file. Example callback: 
`function(err, contentType, readStream){...`

**relayMail(id, callback)** - If configured, this will relay/send the given
email to it's "to" address. Also accepts an email object instead of id.

**setAutoRelayMode(enabled, rules)** - If relay configured, this will auto relay/send emails received
to it's "to" address. The rules allows to filters the emails to send. 