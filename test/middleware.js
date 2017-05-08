/* global describe, it, before, after */
'use strict'

/**
 * MailDev - middleware.js -- test using MailDev as middleware
 */

const assert = require('assert')
const express = require('express')
const proxyMiddleware = require('http-proxy-middleware')
const got = require('got')

const MailDev = require('../index.js')

describe('middleware', function () {
  var server
  var maildev

  before(function (done) {
    const app = express()

    app.get('/', function (req, res) {
      res.send('root')
    })

    maildev = new MailDev({
      silent: true,
      basePathname: '/maildev'
    })

    // proxy all maildev requests to the maildev app
    const proxy = proxyMiddleware('/maildev', {
      target: 'http://localhost:1080',
      ws: true,
      logLevel: 'silent'
    })

    // Maildev available at the specified route '/maildev'
    app.use(proxy)

    server = app.listen(8080, function (_) {
      maildev.listen(done)
    })
  })

  after(function (done) {
    maildev.close(function () {
      maildev.removeAllListeners()
      server.close(done)
    })
  })

  it('should run as middleware in another express app', function (done) {
    // Request to the express app
    got('http://localhost:8080/')
      .then(function (res) {
        assert.equal(res.body, 'root')
        return got('http://localhost:8080/maildev/email')
          .then(function (res) {
            assert.equal(res.statusCode, 200)

            const json = JSON.parse(res.body)
            assert(Array.isArray(json))

            done()
          })
          .catch(done)
      })
      .catch(done)
  })
})
