/* global describe, it */
'use strict'
const spawn = require('child_process').spawn
const path = require('path')
const expect = require('expect')
const utils = require('../lib/utils')

const bin = path.join(__dirname, '../bin/maildev')

describe('cli', () => {
  it('should shutdown with SIGTERM signal', (done) => {
    const maildev = spawn(bin)
    maildev.on('close', (code, signal) => {
      expect(signal).toBe('SIGTERM')
      done()
    })
    maildev.kill('SIGTERM')
  })

  it('should shutdown with SIGINT signal', (done) => {
    const maildev = spawn(bin)
    maildev.on('close', (code, signal) => {
      expect(signal).toBe('SIGINT')
      done()
    })
    maildev.kill('SIGINT')
  })

  it('should works with unknown arguments', (done) => {
    const maildev = spawn(bin, [`--${utils.makeId()}`])
    setTimeout(() => {
      maildev.kill(0)
      done()
    }, 1000)
    maildev.on('error', (err) => done(err))
    maildev.on('close', (code, signal) => done(new Error(`Exit with code: ${code || signal}`)))
  })
})
