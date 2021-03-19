/* global describe, it */
'use strict'

/**
 * MailDev - mailserver.js -- test the mailserver options
 */

const assert = require('assert')
const SMTPConnection = require('smtp-connection')
const http = require('http')

const MailDev = require('../index.js')

describe('mailserver', function () {
  describe('smtp error handling', function () {
    it('Error should be thrown, because listening to server did not work', function (done) {
      const server = http.createServer(() => {})
      const maildev = new MailDev({
        disableWeb: true,
        silent: true,
        smtp: 9025
      })
      server.listen(9025, '0.0.0.0')
      maildev.listen()

      // https://stackoverflow.com/a/9132271/3143704

      var originalHandler = process.listeners('uncaughtException').pop()
      process.removeListener('uncaughtException', originalHandler)

      process.once('uncaughtException', function (err) {
        assert.strictEqual(err.code, 'EADDRINUSE')
        process.listeners('uncaughtException').push(originalHandler)
        maildev.close(() => server.close(done))
      })
    })
  })

  describe('smtp authentication', function () {
    it('should require authentication', function (done) {
      const maildev = new MailDev({
        incomingUser: 'bodhi',
        incomingPass: 'surfing',
        silent: true,
        disableWeb: true
      })

      maildev.listen(function (err) {
        if (err) return done(err)

        const connection = new SMTPConnection({
          port: maildev.port,
          host: maildev.host,
          tls: {
            rejectUnauthorized: false
          }
        })

        connection.connect(function (err) {
          if (err) return done(err)

          const envelope = {
            from: 'angelo.pappas@fbi.gov',
            to: 'johnny.utah@fbi.gov'
          }

          connection.send(envelope, 'They are surfers.', function (err) {
            // This should return an error since we're not authenticating
            assert.notStrictEqual(typeof err, 'undefined')
            assert.strictEqual(err.code, 'EENVELOPE')

            connection.close()
            maildev.close(done)
          })
        })
      })
    })

    it('should authenticate', function (done) {
      const maildev = new MailDev({
        incomingUser: 'bodhi',
        incomingPass: 'surfing',
        silent: true,
        disableWeb: true
      })

      maildev.listen(function (err) {
        if (err) return done(err)

        const connection = new SMTPConnection({
          port: maildev.port,
          host: maildev.host,
          tls: {
            rejectUnauthorized: false
          }
        })

        connection.connect(function (err) {
          if (err) return done(err)

          connection.login({
            user: 'bodhi',
            pass: 'surfing'
          }, function (err) {
            assert.strictEqual(err, null, 'Login should not return error')

            const envelope = {
              from: 'angelo.pappas@fbi.gov',
              to: 'johnny.utah@fbi.gov'
            }

            connection.send(envelope, 'They are surfers.', function (err, info) {
              if (err) return done(err)

              assert.notStrictEqual(typeof info, 'undefined')
              assert.strictEqual(info.accepted.length, 1)
              assert.strictEqual(info.rejected.length, 0)

              connection.close()
              maildev.close(done)
            })
          })
        })
      })
    })
  })
})
