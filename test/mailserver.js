/* global describe, it */

/**
 * MailDev - mailserver.js -- test the mailserver options
 */

var assert = require('assert');
var SMTPConnection = require('smtp-connection');

var MailDev = require('../index.js');


describe('mailserver', function() {

  describe('smtp authentication', function() {

    it('should require authentication', function(done) {

      var maildev = new MailDev({
        incomingUser: 'bodhi',
        incomingPass: 'surfing',
        silent: true
      });

      maildev.listen(function(err) {
        if (err) return done(err);

        var connection = new SMTPConnection({
          port: maildev.port,
          host: maildev.host,
          tls: {
            rejectUnauthorized: false
          }
        });

        connection.connect(function(err) {
          if (err) return done(err);

          var envelope = {
            from: 'angelo.pappas@fbi.gov',
            to: 'johnny.utah@fbi.gov'
          };

          connection.send(envelope, 'They are surfers.', function(err) {

            // This should return an error since we're not authenticating
            assert.notEqual(typeof err, 'undefined');
            assert.equal(err.code, 'EENVELOPE');

            connection.close();
            maildev.end(done);
          });

        });

      });

    });

    it('should authenticate', function(done) {

      var maildev = new MailDev({
        incomingUser: 'bodhi',
        incomingPass: 'surfing',
        silent: true
      });

      maildev.listen(function(err) {
        if (err) return done(err);

        var connection = new SMTPConnection({
          port: maildev.port,
          host: maildev.host,
          tls: {
            rejectUnauthorized: false
          }
        });

        connection.connect(function(err) {
          if (err) return done(err);

          connection.login({
            user: 'bodhi',
            pass: 'surfing'
          }, function(err) {

            assert.equal(err, null, 'Login should not return error');

            var envelope = {
              from: 'angelo.pappas@fbi.gov',
              to: 'johnny.utah@fbi.gov'
            };

            connection.send(envelope, 'They are surfers.', function(err, info) {
              if (err) return done(err);

              assert.notEqual(typeof info, 'undefined');
              assert.equal(info.accepted.length, 1);
              assert.equal(info.rejected.length, 0);

              connection.close();
              maildev.end(done);
            });

          });

        });

      });

    });

  });

});
