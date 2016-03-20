/* global describe, it */

/**
 * MailDev - email.js -- test the email output
 */

var assert = require('assert');
var nodemailer = require('nodemailer');

var MailDev = require('../index.js');

var defaultMailDevOpts = {
  silent: true
};

var defaultNodemailerOpts = {
  port: 1025,
  ignoreTLS: true
};


describe('email', function() {

  it('should handle embedded images with cid', function(done) {

    var maildev = new MailDev(defaultMailDevOpts);
    var transporter = nodemailer.createTransport(defaultNodemailerOpts);

    var emailOpts = {
      from: 'johnny.utah@fbi.gov',
      to: 'bodhi@gmail.com',
      subject: 'Test cid replacement',
      html: '<img src="cid:12345"/>',
      attachments: [
        {
          filename: 'tyler.jpg',
          path: __dirname + '/scripts/tyler.jpg',
          cid: '12345'
        }
      ]
    };

    maildev.on('new', function(email) {

      // Simple replacement to root url
      maildev.getEmailHTML(email.id, function(err, html) {

        assert.equal(html, '<img src="/email/' + email.id + '/attachment/tyler.jpg"/>');

        // Pass baseUrl 
        maildev.getEmailHTML(email.id, 'localhost:8080', function(err, html) {

          assert.equal(html, '<img src="//localhost:8080/email/' + email.id + '/attachment/tyler.jpg"/>');

          maildev.end(function() {
            maildev.removeAllListeners();
            transporter.close();
            done();
          });
        });

      });
    });

    maildev.listen(function(err) {
      if (err) return done(err);
      transporter.sendMail(emailOpts);
    });

  });

});
