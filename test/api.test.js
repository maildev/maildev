/* global describe, it */
'use strict'

/**
 * MailDev - api.js -- test the Node.js API
 */

const assert = require('assert')
const nodemailer = require('nodemailer')
const MailDev = require('../index.js')
const delay = require('../lib/utils').delay

// email opts for nodemailer
const emailOpts = {
  from: '\'Fred Foo 👻\' <foo@example.com>', // sender address
  to: 'bar@example.com, baz@example.com', // list of receivers
  subject: 'Hello ✔', // Subject line
  text: 'Hello world?', // plain text body
  html: '<b>Hello world?</b>' // html body
}

const port = 9025
const createTransporter = async () => {
  const { user, pass } = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: '0.0.0.0',
    port: port,
    auth: { type: 'login', user, pass }
  })
}

function waitMailDevShutdown (maildev) {
  return new Promise((resolve) => {
    maildev.close(() => resolve())
  })
}

describe('API', () => {
  describe('Constructor', () => {
    it('should accept arguments', (done) => {
      const maildev = new MailDev({
        smtp: port,
        web: 9000,
        outgoingHost: 'smtp.gmail.com',
        silent: true,
        disableWeb: true
      })

      assert.strictEqual(maildev.port, port)
      assert.strictEqual(maildev.getOutgoingHost(), 'smtp.gmail.com')

      maildev.close(done)
    })

    it('should return mailserver object', function (done) {
      const maildev = new MailDev({
        silent: true,
        disableWeb: true
      })

      assert.strictEqual(typeof maildev.getEmail, 'function')
      assert.strictEqual(typeof maildev.relayMail, 'function')

      maildev.close(done)
    })
  })

  describe('listen/close', () => {
    const maildev = new MailDev({
      silent: true,
      disableWeb: true
    })

    it('should start the mailserver', (done) => {
      maildev.listen(done)
    })

    it('should stop the mailserver', (done) => {
      maildev.close(done)
    })
  })

  describe('Email', () => {
    it('should receive emails', async () => {
      const maildev = new MailDev({
        silent: true,
        disableWeb: true,
        smtp: port
      })
      maildev.listen()

      const transporter = await createTransporter()

      try {
        await transporter.sendMail(emailOpts)
      } catch (err) {
        if (err) return err
      }

      await delay(100)

      return new Promise((resolve) => {
        maildev.getAllEmail(async (err, emails) => {
          if (err) return resolve(err)

          assert.strictEqual(Array.isArray(emails), true)
          assert.strictEqual(emails.length, 1)
          assert.strictEqual(emails[0].text, emailOpts.text)

          await waitMailDevShutdown(maildev)
          await transporter.close()
          return resolve()
        })
      })
    })

    it('should emit events when receiving emails', async () => {
      const maildev = new MailDev({
        silent: true,
        disableWeb: true,
        smtp: port
      })
      const transporter = await createTransporter()
      maildev.listen()
      await delay(100)

      return new Promise((resolve) => {
        maildev.on('new', async (email) => {
          assert.strictEqual(email.text, emailOpts.text)
          await waitMailDevShutdown(maildev)
          maildev.removeAllListeners()
          await transporter.close()
          resolve()
        })
        transporter.sendMail(emailOpts).then(() => {})
      })
    })
  })
})
