/* global describe, it */

/**
 * MailDev - api.js -- test the Node.js API
 */

var assert = require('assert');
var nodemailer = require('nodemailer');

var MailDev = require('../index.js');


describe('API', function() {

  describe('Constructor', function() {

    it('should accept arguments', function() {

      var maildev = new MailDev({
        smtp: 1026,
        web: 9000,
        outgoingHost: 'smtp.gmail.com',
        silent: true
      });

      assert.equal(maildev.port, 1026);
      assert.equal(maildev.getOutgoingHost(), 'smtp.gmail.com');

    });

    it('should return mailserver object', function() {

      var maildev = new MailDev({
        silent: true
      });

      assert.equal(typeof maildev.getEmail, 'function');
      assert.equal(typeof maildev.relayMail, 'function');

    });

  });

  describe('listen/end', function() {

    var maildev = new MailDev({
      silent: true
    });

    it('should start the mailserver', function(done) {

      maildev.listen(done);

    });

    it('should stop the mailserver', function(done) {

      maildev.end(done);

    });

  });

  describe('Email', function() {

    it('should receive emails', function(done) {

      var maildev = new MailDev({
        silent: true
      });

      var emailOpts = {
        from: 'Angelo Pappas <angelo.pappas@fbi.gov>',
        to: 'Johnny Utah <johnny.utah@fbi.gov>',
        subject: 'You were right.',
        text: 'They are surfers.'
      };

      maildev.listen(function(err) {
        if (err) return done(err);

        var transporter = nodemailer.createTransport({
          port: 1025,
          ignoreTLS: true
        });

        transporter.sendMail(emailOpts, function(err, info) {
          if (err) return done(err);

          // To ensure this passes consistently, we need a delay
          setTimeout(function() {

            maildev.getAllEmail(function(err, emails) {
              if (err) return done(err);

              assert.equal(Array.isArray(emails), true);
              assert.equal(emails.length, 1);
              assert.equal(emails[0].text, emailOpts.text);

              maildev.end(function() {
                done();
                transporter.close();
              });

            });

          }, 10);

        });

      });

    });

    it('should emit events when receiving emails', function(done) {

      var maildev = new MailDev({
        silent: true
      });

      var transporter = nodemailer.createTransport({
        port: 1025,
        ignoreTLS: true
      });

      var emailOpts = {
        from: 'Angelo Pappas <angelo.pappas@fbi.gov>',
        to: 'Johnny Utah <johnny.utah@fbi.gov>',
        subject: 'You were right.',
        text: 'They are surfers.'
      };

      maildev.on('new', function(email) {

        assert.equal(email.text, emailOpts.text);

        maildev.end(function() {
          maildev.removeAllListeners();
          transporter.close();
          done();
        });

      });

      maildev.listen(function(err) {
        if (err) return done(err);

        transporter.sendMail(emailOpts);

      });

    });

  });

});
