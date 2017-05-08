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
      expect(utils.makeId()).toMatch(/^[a-z0-9]+$/i)
    })
  })
})
