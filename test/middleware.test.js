/* global describe, it, before, after */
'use strict'

/**
 * MailDev - middleware.js -- test using MailDev as middleware
 */
// We add this setting to tell nodemailer the host isn't secure during dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const assert = require('assert')
const path = require('path')
const nodemailer = require('nodemailer')
const express = require('express')
const proxyMiddleware = require('http-proxy-middleware').createProxyMiddleware
const got = require('got')
const MailDev = require('../index.js')

const smtpPort = 9080
const webPort = 9081
const proxyPort = 9082
const host = '0.0.0.0'
const createTransporter = async () => {
  const { user, pass } = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: '0.0.0.0',
    port: smtpPort,
    auth: { type: 'login', user, pass }
  })
}

function waitMailDevShutdown (maildev) {
  return new Promise((resolve) => {
    maildev.close(() => resolve())
  })
}

describe('middleware', function () {
  let server
  let maildev

  before(function (done) {
    const app = express()

    app.get('/', (_, res) => res.send('root'))

    maildev = new MailDev({
      silent: true,
      basePathname: '/maildev',
      smtp: smtpPort,
      web: webPort
    })

    // proxy all maildev requests to the maildev app
    const proxy = proxyMiddleware('/maildev', {
      target: `http://${host}:${webPort}`,
      ws: true,
      logLevel: 'silent'
    })

    // Maildev available at the specified route '/maildev'
    app.use(proxy)

    server = app.listen(proxyPort, function (_) {
      maildev.listen(done)
    })
  })

  after(async () => {
    await waitMailDevShutdown(maildev)
    return new Promise((resolve) => {
      maildev.removeAllListeners()
      server.close()
      resolve()
    })
  })

  it('should run as middleware in another express app', function (done) {
    // Request to the express app
    got(`http://${host}:${proxyPort}/`)
      .then((res) => {
        assert.strictEqual(res.body, 'root')
        return got(`http://${host}:${proxyPort}/maildev/email`)
          .then((res) => {
            assert.strictEqual(res.statusCode, 200)

            const json = JSON.parse(res.body)
            assert(Array.isArray(json))

            done()
          })
          .catch(done)
      })
      .catch(done)
  })

  it('should serve email attachments with working urls', async () => {
    const transporter = await createTransporter()

    const emailOpts = {
      from: 'johnny.utah@fbi.gov',
      to: 'bodhi@gmail.com',
      subject: 'Test cid replacement for use w/ middleware',
      html: '<img src="cid:12345"/>',
      attachments: [
        {
          filename: 'tyler.jpg',
          path: path.join(__dirname, '/tyler.jpg'),
          cid: '12345'
        }
      ]
    }

    return new Promise((resolve) => {
      maildev.on('new', (email) => {
        got(`http://${host}:${proxyPort}/maildev/email/${email.id}/html`)
          .then(async (res) => {
            assert.strictEqual(
              res.body,
              `<img src="//${host}:${proxyPort}/maildev/email/${email.id}/attachment/tyler.jpg"/>`
            )
            await maildev.close()
            maildev.removeAllListeners()
            resolve()
          })
          .catch((err) => resolve(err))
      })
      transporter.sendMail(emailOpts)
    })
  })

  it('should allow email filtering', async () => {
    const transporter = await createTransporter()

    const emailOpts = {
      from: 'johnny.utah@fbi.gov',
      to: 'bodhi@gmail.com',
      subject: 'Test',
      html: 'Test'
    }

    return new Promise((resolve) => {
      maildev.on('new', function () {
        got(`http://${host}:${proxyPort}/maildev/email?subject=Test&to.address=bodhi@gmail.com`)
          .then(function (res) {
            assert.strictEqual(res.statusCode, 200)
            const json = JSON.parse(res.body)
            assert(json.length === 1)
            assert(json[0].subject === emailOpts.subject)
            resolve()
          })
          .catch((err) => resolve(err))
      })
      transporter.sendMail(emailOpts)
    })
  })
})
