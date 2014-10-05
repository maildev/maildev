/* global describe, it */

/**
 * MailDev - api.js -- test the Node.js API
 */

var assert = require('assert')
  , nodemailer = require('nodemailer')
  ;

var MailDev = require('../index.js');


describe('API', function(){

  describe('Constructor', function(){
    
    it('should accept arguments', function(done){

      var maildev = new MailDev({
        smtp: 1026,
        web: 9000,
        outgoingHost: 'smtp.gmail.com'
      });

      assert.equal(maildev.port, 1026);
      assert.equal(maildev.outgoingHost, 'smtp.gmail.com');

      maildev.end(done);
    });

    it('should return mailserver object', function(done){

      var maildev = new MailDev();

      assert.equal(typeof maildev.getEmail, 'function');
      assert.equal(typeof maildev.relayMail, 'function');

      maildev.end(done);
    });

  });

  describe('Email', function(){

    it('should receive emails', function(done){

      var maildev = new MailDev();

      var transporter = nodemailer.createTransport({
        port: 1025,
        ignoreTLS: true
      });

      var emailOpts = {
          from: 'Angelo Pappas <angelo.pappas@fbi.gov>'
        , to: 'Johnny Utah <johnny.utah@fbi.gov>'
        , subject: 'You were right.'
        , text: 'They are surfers.'
      };

      transporter.sendMail(emailOpts, function(err, info){
        if (err) return done(err);

        maildev.getAllEmail(function(err, emails){
          if (err) return done(err);

          assert.equal(Array.isArray(emails), true);
          assert.equal(emails.length, 1);
          assert.equal(emails[0].text, emailOpts.text);

          maildev.end(function(){
            done();
            transporter.close();
          });
        });

      });

    });

    it('should emit events when receiving emails', function(done){

      var maildev = new MailDev();

      var transporter = nodemailer.createTransport({
        port: 1025,
        ignoreTLS: true
      });

      var emailOpts = {
          from: 'Angelo Pappas <angelo.pappas@fbi.gov>'
        , to: 'Johnny Utah <johnny.utah@fbi.gov>'
        , subject: 'You were right.'
        , text: 'They are surfers.'
      };

      maildev.on('new', function(email){

        assert.equal(email.text, emailOpts.text);

        maildev.end(function(){
          done();
          transporter.close();
        });

      });

      transporter.sendMail(emailOpts);

    });

  });

});