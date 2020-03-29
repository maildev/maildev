/* global describe, it */
const expect = require('expect')
const { appendOptions } = require('../lib/options')

describe('options', () => {
  describe('appendOptions', () => {
    class Program {
      constructor () {
        this.options = []
      }
      option (...args) {
        this.options.push([...args])
        return this
      }
    }

    it('should chain all options', () => {
      const program = new Program()
      const options = [
        ['--flag', 'ENV_VARIABLE', 'Description!', 'default'],
        ['--another-flag', 'ENV_VARIABLE_2', 'Another description', 10]
      ]
      const result = appendOptions(program, options)
      expect(result.options[0][0]).toEqual('--flag')
      expect(result.options[0][1]).toEqual('Description!')
      expect(result.options[0][2]).toEqual('default')
      expect(result.options[1][0]).toEqual('--another-flag')
      expect(result.options[1][1]).toEqual('Another description')
      expect(result.options[1][2]).toEqual(10)
    })

    it('should correctly handle parser functions', () => {
      const program = new Program()
      const options = [
        ['--flag', 'ENV_VARIABLE', 'Description!', 'default', function (v) { return 'x' + v }]
      ]
      const result = appendOptions(program, options)
      expect(result.options[0][0]).toEqual('--flag')
      expect(result.options[0][1]).toEqual('Description!')
      expect(typeof result.options[0][2]).toEqual('function')
      expect(result.options[0][3]).toEqual('default')
    })
  })
})
