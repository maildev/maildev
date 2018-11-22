/* global describe, it */
'use strict'

/**
 * MailDev - api.js -- test the Node.js API
 */

const assert = require('assert')
const nodemailer = require('nodemailer')

const MailDev = require('../index.js')

describe('API', function () {
  describe('Constructor', function () {
    it('should accept arguments', function (done) {
      const maildev = new MailDev({
        smtp: 1026,
        web: 9000,
        outgoingHost: 'smtp.gmail.com',
        silent: true,
        disableWeb: true
      })

      assert.equal(maildev.port, 1026)
      assert.equal(maildev.getOutgoingHost(), 'smtp.gmail.com')

      maildev.close(done)
    })

    it('should return mailserver object', function (done) {
      const maildev = new MailDev({
        silent: true,
        disableWeb: true
      })

      assert.equal(typeof maildev.getEmail, 'function')
      assert.equal(typeof maildev.relayMail, 'function')

      maildev.close(done)
    })
  })

  describe('listen/close', function () {
    const maildev = new MailDev({
      silent: true,
      disableWeb: true
    })

    it('should start the mailserver', function (done) {
      maildev.listen(done)
    })

    it('should stop the mailserver', function (done) {
      maildev.close(done)
    })
  })

  describe('Email', function () {
    it('should receive emails', function (done) {
      const maildev = new MailDev({
        silent: true,
        disableWeb: true
      })

      const emailOpts = {
        from: 'Angelo Pappas <angelo.pappas@fbi.gov>',
        to: 'Johnny Utah <johnny.utah@fbi.gov>',
        subject: 'You were right.',
        text: 'They are surfers.\n'
      }

      maildev.listen(function (err) {
        if (err) return done(err)

        const transporter = nodemailer.createTransport({
          port: 1025,
          ignoreTLS: true
        })

        transporter.sendMail(emailOpts, function (err, info) {
          if (err) return done(err)

          // To ensure this passes consistently, we need a delay
          setTimeout(function () {
            maildev.getAllEmail(function (err, emails) {
              if (err) return done(err)

              assert.equal(Array.isArray(emails), true)
              assert.equal(emails.length, 1)
              assert.equal(emails[0].text, emailOpts.text)

              maildev.close(function () {
                done()
                transporter.close()
              })
            })
          }, 10)
        })
      })
    })

    it('should emit events when receiving emails', function (done) {
      const maildev = new MailDev({
        silent: true,
        disableWeb: true
      })

      const transporter = nodemailer.createTransport({
        port: 1025,
        ignoreTLS: true
      })

      const emailOpts = {
        from: 'Angelo Pappas <angelo.pappas@fbi.gov>',
        to: 'Johnny Utah <johnny.utah@fbi.gov>',
        subject: 'You were right.',
        text: 'They are surfers.\n'
      }

      maildev.on('new', function (email) {
        assert.equal(email.text, emailOpts.text)

        maildev.close(function () {
          maildev.removeAllListeners()
          transporter.close()
          done()
        })
      })

      maildev.listen(function (err) {
        if (err) return done(err)

        transporter.sendMail(emailOpts)
      })
    })

    it('should respect store size limit', function (done) {
      const maildev = new MailDev({
        silent: true,
        disableWeb: true,
        storeLimit: 1
      })

      const transporter = nodemailer.createTransport({
        port: 1025,
        ignoreTLS: true
      })

      const emailOpts = {
        from: 'Angelo Pappas <angelo.pappas@fbi.gov>',
        to: 'Johnny Utah <johnny.utah@fbi.gov>',
        text: 'They are surfers.\n'
      }

      let receivedCount = 2
      let deletedCount = 1
      let lastReceived = null

      // As the store is currently a global variable and is persisted between
      // test runs, we clear it here for the purpose of this test.
      maildev.store.length = 0

      // Ensure that both `new` and `delete` events are received, regardless
      // of the order in which they arrive.
      function onEvent () {
        if (!receivedCount && !deletedCount) {
          assert.equal(receivedCount, 0)
          assert.equal(deletedCount, 0)
          assert.equal(maildev.store.length, 1)
          assert.equal(maildev.store[0].subject, lastReceived)

          maildev.close(function () {
            maildev.removeAllListeners()
            transporter.close()
            done()
          })
        }
      }

      maildev.on('new', function (email) {
        receivedCount--
        lastReceived = email.subject
        onEvent()
      })

      maildev.on('delete', function (email) {
        deletedCount--
        onEvent()
      })

      maildev.listen(function (err) {
        if (err) return done(err)

        transporter.sendMail(Object.assign(emailOpts, { subject: '1' }))
        transporter.sendMail(Object.assign(emailOpts, { subject: '2' }))
      })
    })
  })
})
