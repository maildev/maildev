/* global describe, it */
'use strict'
const spawn = require('child_process').spawn
const path = require('path')
const expect = require('expect')

const bin = path.join(__dirname, '../bin/maildev')

describe('cli', () => {
  it('should shutdown with SIGTERM signal', (done) => {
    const maildev = spawn(bin, [], { cwd: undefined, env: process.env, shell: true })
    maildev.on('close', (code, signal) => {
      expect(signal).toBe('SIGTERM')
      done()
    })
    maildev.on('spawn', () => {
      maildev.kill('SIGTERM')
    })
  }).timeout(10000)

  it('should shutdown with SIGINT signal', (done) => {
    const maildev = spawn(bin, [], { cwd: undefined, env: process.env, shell: true })
    maildev.on('close', (code, signal) => {
      expect(signal).toBe('SIGINT')
      done()
    })
    maildev.on('spawn', () => {
      maildev.kill('SIGINT')
    })
  }).timeout(10000)
})
