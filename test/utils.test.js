/* global describe, it */
'use strict'
const expect = require('expect')
const utils = require('../lib/utils')

describe('utils', () => {
  describe('makeId', () => {
    it('should make an id 8 characters long', () => {
      expect(utils.makeId().length).toEqual(8)
    })

    it('should be alphanumeric', () => {
      const alphaNumericRegex = /^[a-z0-9]+$/i
      expect(utils.makeId()).toMatch(alphaNumericRegex)
    })
  })

  describe('validateEmail', () => {
    it('should accept an email address', () => {
      expect(utils.validateEmail('foo@bar.com')).toMatch(true)
    })

    it('should accept an email address', () => {
      expect(utils.validateEmail('foo+foo2@bar.com')).toMatch(true)
    })

    it('should accept an email address', () => {
      expect(utils.validateEmail('2')).toMatch(false)
    })

    it('should accept an email address', () => {
      expect(utils.validateEmail('myemail.com')).toMatch(false)
    })

    it('should accept an email address', () => {
      expect(utils.validateEmail('test.com')).toMatch(false)
    })
  })
})
