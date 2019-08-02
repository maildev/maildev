/* global describe, it */
'use strict'
const expect = require('expect')
const SMTPServer = require('smtp-server').SMTPServer
const outgoing = require('../lib/outgoing')
const smptHelpers = require('../lib/helpers/smtp')

let lastPort = 1025
const getPort = () => lastPort++

describe('outgoing', () => {
  describe('setup', () => {
    it('should enable outgoing email', (done) => {
      const port = getPort()
      const smtpserver = new SMTPServer()
      smtpserver.listen(port, (err) => {
        expect(err).toNotExist()
        outgoing.setup()
        expect(outgoing.isEnabled()).toBe(true)
        outgoing.getClient().on('end', () => {
          smtpserver.close(done)
        })
        outgoing.close()
      })
    })
  })

  describe('relayMail', () => {
    it('should set auto relay mode without an initialised client', () => {
      let spy = expect.createSpy()
      spy = expect.spyOn(require('../lib/logger'), 'info')
      // Close the SMTP server before doing anything, an investigation is needed to find where the SMTP connection is not closed
      outgoing.getClient().on('end', () => {
        outgoing.setAutoRelayMode()

        expect(outgoing.getConfig().autoRelay).toBe(false)
        expect(spy).toHaveBeenCalledWith('Outgoing mail not configured - Auto relay mode ignored')
        spy.restore()
      })
    })

    it('should set auto relay mode with a wrong rules', (done) => {
      const rules = 'testrule'
      let spy = expect.createSpy()
      spy = expect.spyOn(require('../lib/logger'), 'error')
      outgoing.setup()

      // TODO: Use the expect toThrow helper, I will need to update the version of the expect library before being able to do it
      try {
        outgoing.setAutoRelayMode(true, rules)
      } catch (e) {
        expect(e.message).toBe("ENOENT: no such file or directory, open 'testrule'")
        expect(spy).toHaveBeenCalledWith(`Error reading config file at ${rules}`)
        spy.restore()

        done()
      }
    })

    it('should set an auto relay email address', (done) => {
      const rules = ['test']
      const emailAddress = 'test@test.com'

      let spy = expect.createSpy()
      spy = expect.spyOn(require('../lib/logger'), 'info')

      outgoing.setup()
      outgoing.setAutoRelayMode(true, rules, emailAddress)
      const config = outgoing.getConfig()
      expect(config.autoRelay).toBe(true)
      expect(config.autoRelayRules).toBe(rules)
      expect(config.autoRelayAddress).toBe(emailAddress)

      expect(spy).toHaveBeenCalledWith([
        'Auto-Relay mode on',
        `Relaying all emails to ${emailAddress}`,
        `Relay rules: ${JSON.stringify(rules)}`
      ].join((', ')))

      done()
    })

    it('should send outgoing email', (done) => {
      const port = getPort()
      const email = {
        envelope: {
          to: ['receiver@test.com'],
          from: ['sender@test.com']
        },
        subject: 'Test email'
      }
      const message = 'A test email body'

      // When the email is full received we deem this successful
      const emailReceived = (emailBody) => {
        // trim b/c new lines are added
        expect(emailBody.trim()).toBe(message)
        outgoing.close()
        smtpserver.close(done)
      }

      const smtpserver = new SMTPServer({
        authOptional: true,
        onData (stream, session, callback) {
          const chunks = []
          stream.on('data', (chunk) => chunks.push(chunk))
          stream.on('end', () => {
            emailReceived(Buffer.concat(chunks).toString())
            callback()
          })
        }
      })
      smtpserver.listen(port, (err) => {
        expect(err).toNotExist()
        outgoing.setup(null, port)
        outgoing.relayMail(email, message, false, (err) => {
          expect(err).toNotExist()
          // emailReceived should now be called to close this test
        })
      })
    })

    it('should handle authentication with outgoing smtp server', (done) => {
      const username = 'testuser'
      const password = 'testpassword'
      const port = getPort()
      const smtpserver = new SMTPServer({
        onAuth: smptHelpers.createOnAuthCallback(username, password)
      })
      smtpserver.listen(port, (err) => {
        expect(err).toNotExist()
        outgoing.setup(null, port, username, password)

        const email = {
          envelope: {
            to: ['receiver@test.com'],
            from: ['sender@test.com']
          },
          subject: 'Test email'
        }
        const message = 'A test email body'

        outgoing.relayMail(email, message, false, (err) => {
          expect(err).toNotExist()
          outgoing.close()
          smtpserver.close(done)
        })
      })
    })
  })
})
