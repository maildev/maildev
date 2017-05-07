/* global describe, it */

/**
 * MailDev - middleware.js -- test using MailDev as middleware
 */

var assert = require('assert')
var nodemailer = require('nodemailer')
var express = require('express')
var proxyMiddleware = require('http-proxy-middleware')
var request = require('request')

var MailDev = require('../index.js')

var defaultNodemailerOpts = {
  port: 1025,
  ignoreTLS: true
}

describe('middleware', function () {
  var server
  var maildev

  before(function (done) {
    var app = express()

    app.get('/', function (req, res) {
      res.send('root')
    })

    maildev = new MailDev({
      silent: true,
      basePathname: '/maildev'
    })

    // proxy all maildev requests to the maildev app
    var proxy = proxyMiddleware('/maildev', {
      target: 'http://localhost:1080',
      ws: true,
      logLevel: 'silent'
    })

    // Maildev available at the specified route '/maildev'
    app.use(proxy)

    server = app.listen(8080, function (err) {
      maildev.listen(done)
    })
  })

  after(function (done) {
    maildev.end(function () {
      maildev.removeAllListeners()
      server.close(done)
    })
  })

  it('should run as middleware in another express app', function (done) {
    // Request to the express app
    request.get('http://localhost:8080/', function (err, res, body) {
      assert.equal(body, 'root')

      // Request to the maildev api
      request.get('http://localhost:8080/maildev/email', function (err, res, body) {
        assert.equal(res.statusCode, 200)

        var json = JSON.parse(body)
        assert(Array.isArray(json))

        done()
      })
    })
  })

  it('should serve email attachments with working urls', function (done) {
    var transporter = nodemailer.createTransport(defaultNodemailerOpts)

    var emailOpts = {
      from: 'johnny.utah@fbi.gov',
      to: 'bodhi@gmail.com',
      subject: 'Test cid replacement for use w/ middleware',
      html: '<img src="cid:12345"/>',
      attachments: [
        {
          filename: 'tyler.jpg',
          path: __dirname + '/scripts/tyler.jpg',
          cid: '12345'
        }
      ]
    }

    transporter.sendMail(emailOpts)

    maildev.on('new', function (email) {
      request.get('http://localhost:8080/maildev/email/' + email.id + '/html', function (err, res, body) {
        assert.equal(body, '<img src="//localhost:8080/maildev/email/' + email.id + '/attachment/tyler.jpg"/>')

        maildev.removeAllListeners()
        done()
      })
    })
  })
})
