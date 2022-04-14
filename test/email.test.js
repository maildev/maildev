/* global describe, it, before, after */
'use strict'

/**
 * MailDev - email.js -- test the email output
 */
const assert = require('assert')
const fs = require('fs')
const http = require('http')
const path = require('path')
const nodemailer = require('nodemailer')

const MailDev = require('../index.js')

const port = 9025
const web = 8080

const defaultMailDevOpts = {
  disableWeb: false,
  silent: true,
  smtp: port,
  web: web,
  ip: '0.0.0.0'
}

const createTransporter = async () => {
  const { user, pass } = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: '0.0.0.0',
    port: port,
    auth: { type: 'login', user, pass }
  })
}

function waitMailDevShutdown (maildev) {
  return new Promise((resolve) => {
    maildev.close(() => resolve())
  })
}

describe('email', () => {
  let maildev

  before(function (done) {
    maildev = new MailDev(defaultMailDevOpts)
    maildev.listen(done)
  })

  after(async () => {
    await waitMailDevShutdown(maildev)
    return new Promise((resolve) => {
      maildev.removeAllListeners()
      resolve()
    })
  })

  it('should stripe javascript from emails', async () => {
    const transporter = await createTransporter()
    const emailForTest = {
      from: 'johnny.utah@fbi.gov',
      to: 'bodhi@gmail.com',
      subject: 'Test cid replacement #1',
      text: 'The wax at the bank was surfer wax!!!',
      html: '<!DOCTYPE html><html><head></head><body>' +
            '<script type=\'text/javascript\'>alert("Hello World")</script>' +
            '<p>The wax at the bank was surfer wax!!!</p>' +
            '</body></html>'
    }

    return new Promise((resolve) => {
      maildev.on('new', (email) => {
        maildev.getEmailHTML(email.id, async (_, html) => {
          const contentWithoutNewLine = html.replace(/\n/g, '')
          assert.strictEqual(contentWithoutNewLine, '<html><head></head><body><p>The wax at the bank was surfer wax!!!</p></body></html>')
          await transporter.close()
          resolve()
        })
      })

      transporter.sendMail(emailForTest)
    })
  })

  it('should preserve html with table elements', async () => {
    const transporter = await createTransporter()
    const emailForTest = {
      from: 'johnny.utah@fbi.gov',
      to: 'bodhi@gmail.com',
      subject: 'Test html table',
      html: '<table style="border:1px solid red">' +
            '<tr><td>A1</td><td>B1</td></tr>' +
            '<tr><td>A2</td><td>B2</td></tr>' +
            '</table>'
    }

    return new Promise((resolve) => {
      maildev.on('new', (email) => {
        maildev.getEmailHTML(email.id, async (_, html) => {
          const contentWithoutNewLine = html.replace(/\n/g, '')
          assert.strictEqual(contentWithoutNewLine, '<table style="border:1px solid red"><tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr></table>')
          await transporter.close()
          resolve()
        })
      })

      transporter.sendMail(emailForTest)
    })
  })

  it('should handle embedded images with cid', async () => {
    const transporter = await createTransporter()

    const emailsForTest = [
      {
        from: 'johnny.utah@fbi.gov',
        to: 'bodhi@gmail.com',
        subject: 'Test cid replacement #1',
        html: '<img src="cid:image"/>',
        attachments: [
          {
            filename: 'tyler.jpg',
            path: path.join(__dirname, 'tyler.jpg'),
            cid: 'image'
          }
        ]
      },
      {
        from: 'johnny.utah@fbi.gov',
        to: 'bodhi@gmail.com',
        subject: 'Test cid replacement #2',
        html: '<img src="cid:image"/>',
        attachments: [
          {
            filename: 'wave.jpg',
            path: path.join(__dirname, 'wave.jpg'),
            cid: 'image'
          }
        ]
      }
    ]

    let seenEmails = 0

    return new Promise((resolve, reject) => {
      maildev.on('new', (email) => {
        // Simple replacement to root url
        maildev.getEmailHTML(email.id, (_, html) => {
          const attachmentFilename = (email.subject.endsWith('#1')) ? 'tyler.jpg' : 'wave.jpg'
          const contentWithoutNewLine = html.replace(/\n/g, '')
          assert.strictEqual(contentWithoutNewLine, '<img src="/email/' + email.id + '/attachment/' + attachmentFilename + '">')
          const host = `localhost:${web}`
          const attachmentLink = `${host}/email/${email.id}/attachment/${attachmentFilename}`

          // Pass baseUrl
          maildev.getEmailHTML(email.id, host, (_, html) => {
            const contentWithoutNewLine = html.replace(/\n/g, '')
            assert.strictEqual(contentWithoutNewLine, `<img src="//${attachmentLink}">`)

            // Check contents of attached/embedded files
            http.get(`http://${attachmentLink}`, (res) => {
              if (res.statusCode !== 200) {
                reject(new Error('Failed to get attachment: ' + res.statusCode))
              }
              let data = ''
              res.setEncoding('binary')
              res.on('data', (chunk) => {
                data += chunk
              })
              res.on('end', () => {
                const fileContents = fs.readFileSync(path.join(__dirname, attachmentFilename), 'binary')
                assert.strictEqual(data, fileContents)

                seenEmails += 1
                if (seenEmails) {
                  resolve()
                }
              })
            })
          })
        })
      })

      emailsForTest.forEach(async (email) => {
        await transporter.sendMail(email)
      })
    })
  })
})
