/* global describe, it */
'use strict'
const jest = require('jest-mock')
const expect = require('expect').expect
const auth = require('../lib/auth')
const NO_BASE_PATHNAME = ''

describe('auththentication middleware', () => {
  it('should return a function', () => {
    const middleware = auth(NO_BASE_PATHNAME, 'user', 'password')
    expect(typeof middleware).toBe('function')
  })

  it('should return Unauthorized without authorization headers', () => {
    const middleware = auth(NO_BASE_PATHNAME, 'user', 'password')
    const fakeRequest = {
      headers: {}
    }
    const fakeResponse = {
      statusCode: null,
      setHeader: jest.fn(),
      send: jest.fn()
    }

    middleware(fakeRequest, fakeResponse)

    expect(fakeResponse.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Basic realm="Authentication required"'
    )
    expect(fakeResponse.send).toHaveBeenCalled()
  })

  it('should return Unauthorized with incorrect authorization username and password', () => {
    const middleware = auth(NO_BASE_PATHNAME, 'user', 'password')
    const fakeRequest = {
      headers: {
        authorization: `Basic ${Buffer.from('not:correct').toString('base64')}`
      }
    }
    const fakeResponse = {
      statusCode: null,
      setHeader: jest.fn(),
      send: jest.fn()
    }

    middleware(fakeRequest, fakeResponse)

    expect()
    expect(fakeResponse.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Basic realm="Authentication required"'
    )
    expect(fakeResponse.send).toHaveBeenCalled()
  })

  it('should call next function with valid username and password', (done) => {
    const middleware = auth(NO_BASE_PATHNAME, 'user', 'password')
    const fakeRequest = {
      headers: {
        authorization: `Basic ${Buffer.from('user:password').toString('base64')}`
      }
    }
    const fakeResponse = {
      statusCode: null,
      setHeader: function () {},
      send: function () {}
    }

    middleware(fakeRequest, fakeResponse, done)
  })

  it('should call next function for health checks without basePathname', (done) => {
    const middleware = auth('', 'user', 'password')
    const fakeRequest = {
      path: '/healthz',
      headers: { }
    }
    const fakeResponse = {
      statusCode: null,
      setHeader: function () {},
      send: function () {}
    }

    middleware(fakeRequest, fakeResponse, done)
  })

  it('should call next function for health checks with basePathname', (done) => {
    const middleware = auth('/basePathname', 'user', 'password')
    const fakeRequest = {
      path: '/basePathname/healthz',
      headers: { }
    }
    const fakeResponse = {
      statusCode: null,
      setHeader: function () {},
      send: function () {}
    }

    middleware(fakeRequest, fakeResponse, done)
  })
})
