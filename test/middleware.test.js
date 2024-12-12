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
const MailDev = require('../index.js')

const smtpPort = 9080
const webPort = 9081
const proxyPort = 9082
const host = '0.0.0.0'
const createTransporter = async () => {
  return nodemailer.createTransport({
    host: '0.0.0.0',
    port: smtpPort,
    auth: { type: 'login', user: 'username', pass: 'password' }
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
    const proxy = proxyMiddleware({
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

  it('should run as middleware in another express app', async () => {
    // Request to the express app
    const res = await globalThis.fetch(`http://${host}:${proxyPort}/`)
    assert.strictEqual(await res.text(), 'root')

    const email = await globalThis.fetch(`http://${host}:${proxyPort}/maildev/email`)
    assert.strictEqual(email.status, 200)
    const json = JSON.parse(await email.text())
    assert(Array.isArray(json))
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
        globalThis.fetch(`http://${host}:${proxyPort}/maildev/email/${email.id}/html`)
          .then(async (res) => {
            assert.strictEqual(
              await res.text(),
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
        globalThis.fetch(`http://${host}:${proxyPort}/maildev/email?subject=Test&to.address=bodhi@gmail.com`)
          .then(async function (res) {
            assert.strictEqual(res.status, 200)
            const json = JSON.parse(await res.text())
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
