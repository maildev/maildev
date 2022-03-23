/* global describe, it */
'use strict'
const expect = require('expect')
const { calculateBcc } = require('../lib/helpers/bcc')

describe('[bcc helpers]', () => {
  describe('calculateBcc', () => {
    it('works with empty addresses', () => {
      const actual = calculateBcc([], [], [])

      expect(actual).toEqual([])
    })

    it('does not modify input arrays', () => {
      const recipients = ['x@y', 'a@b']
      const to = ['a@b']
      const cc = ['x@y']
      calculateBcc(recipients, to, cc)

      expect(recipients).toEqual(['x@y', 'a@b'])
      expect(to).toEqual(['a@b'])
      expect(cc).toEqual(['x@y'])
    })

    describe('calculates bcc as the difference of (recipients - to - cc)', () => {
      it('empty when all recipients are consumed', () => {
        const actual = calculateBcc(['x@y', 'a@b'], ['a@b'], ['x@y'])

        expect(actual).toEqual([])
      })

      it('when same recipient is in TO, CC and BCC', () => {
        const actual = calculateBcc(['a@b', 'a@b', 'a@b'], ['a@b'], ['a@b'])

        expect(actual).toEqual([{ address: 'a@b', name: '' }])
      })

      it('comparison of addresses is case sensitive', () => {
        const actual = calculateBcc(
          ['bodhi@gmail.com', 'johnny.first@fbi.gov', 'Johnny.first@fbi.gov'],
          ['Johnny.first@fbi.gov'],
          ['bodhi@gmail.com'])

        expect(actual).toEqual([{ address: 'johnny.first@fbi.gov', name: '' }])
      })
    })
  })
})
