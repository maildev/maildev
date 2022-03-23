/* global describe, it, before, after */
'use strict'

/**
 * MailDev - mailserver.js -- test the mailserver options
 */

const assert = require('assert')
const SMTPConnection = require('../vendor/smtp-connection')
// const http = require('http')
// const delay = require('../lib/utils').delay

const MailDev = require('../index.js')

// const port = 9025

function waitMailDevShutdown (maildev) {
  return new Promise((resolve) => {
    maildev.close(() => resolve())
  })
}

const port = 9025

describe('mailserver', () => {
  let maildev

  before(function (done) {
    maildev = new MailDev({
      incomingUser: 'bodhi',
      incomingPass: 'surfing',
      silent: true,
      disableWeb: true,
      smtp: port
    })
    maildev.listen(done)
  })

  after(async () => {
    await waitMailDevShutdown(maildev)
    return new Promise((resolve) => {
      maildev.removeAllListeners()
      resolve()
    })
  })

  describe('smtp error handling', () => {
    it('Error should be thrown, because listening to server did not work', async () => {
      // https://stackoverflow.com/a/9132271/3143704
      const originalHandler = process.listeners('uncaughtException').pop()
      process.removeListener('uncaughtException', originalHandler)
      process.setMaxListeners(0)
      return new Promise((resolve) => {
        const maildevConflict = new MailDev({
          disableWeb: true,
          silent: true,
          smtp: port
        })
        maildevConflict.listen()

        process.on('uncaughtException', async (err) => {
          if (err.code === 'EADDRINUSE') {
            process.listeners('uncaughtException').push(originalHandler)
            await waitMailDevShutdown(maildevConflict)
            resolve()
          }
        })
      })
    })
  })

  describe('smtp authentication', () => {
    it('should require authentication', function (done) {
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

    it('should authenticate', function (done) {
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
