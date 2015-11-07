
/**
 * MailDev - routes.js
 */
var express = require('express');
var pkg = require('../package.json');


module.exports = function(app, mailserver) {

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

    mailserver.getEmailHTML( req.params.id, function(err, html){
      if (err) return res.status(404).json({ error: err.message });

      res.send(html);
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

  // Serve email.eml
  app.get('/email/:id/download', function(req, res){

    mailserver.getEmailEml(req.params.id, function(err, contentType, filename, readStream){
      if (err) return res.status(404).json('File not found');

      res.setHeader('Content-disposition', 'attachment; filename=' + filename);
      res.contentType(contentType);
      readStream.pipe(res);
    });

  });

  // Get email source from .eml file
  app.get('/email/:id/source', function(req, res){

    mailserver.getRawEmail( req.params.id, function(err, readStream){

      if (err) return res.status(404).json('File not found');
      readStream.pipe(res);
    });

  });

  // Get any config settings for display
  app.get('/config', function(req, res){

    res.json({
      version:  pkg.version,
      smtpPort: mailserver.port,
      isOutgoingEnabled: mailserver.isOutgoingEnabled(),
      outgoingHost: mailserver.getOutgoingHost()
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

};
