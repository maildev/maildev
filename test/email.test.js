/* global describe, it */
'use strict'

/**
 * MailDev - email.js -- test the email output
 */
// We add this setting to tell nodemailer the host isn't secure during dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const assert = require('assert')
const fs = require('fs')
const http = require('http')
const path = require('path')
const nodemailer = require('nodemailer')
const delay = require('../lib/utils').delay

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
  it('should stripe javascript from emails', async () => {
    const maildev = new MailDev(defaultMailDevOpts)
    const transporter = await createTransporter()
    const email = {
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
          assert.strictEqual(contentWithoutNewLine, '<p>alert(&quot;Hello World&quot;)</p><p>The wax at the bank was surfer wax!!!</p>')
          await waitMailDevShutdown(maildev)
          maildev.removeAllListeners()
          await transporter.close()
          resolve()
        })
      })

      // test callback
      maildev.listen((err) => {
        if (err) return resolve(err)
        transporter.sendMail(email)
      })
    })
  })

  it('should handle embedded images with cid', async () => {
    const maildev = new MailDev(defaultMailDevOpts)
    const transporter = await createTransporter()
    maildev.listen()
    await delay(100)

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

    return new Promise((resolve) => {
      maildev.on('new', async (email) => {
        // Simple replacement to root url
        maildev.getEmailHTML(email.id, (_, html) => {
          const attachmentFilename = (email.subject.endsWith('#1')) ? 'tyler.jpg' : 'wave.jpg'
          assert.strictEqual(html, '<img src="/email/' + email.id + '/attachment/' + attachmentFilename + '">')

          const host = `localhost:${web}`
          const attachmentLink = `${host}/email/${email.id}/attachment/${attachmentFilename}`

          // Pass baseUrl
          maildev.getEmailHTML(email.id, host, (_, html) => {
            assert.strictEqual(html, `<img src="//${attachmentLink}">`)

            // Check contents of attached/embedded files
            http.get(`http://${attachmentLink}`, (res) => {
              if (res.statusCode !== 200) {
                resolve(new Error('Failed to get attachment: ' + res.statusCode))
              }
              let data = ''
              res.setEncoding('binary')
              res.on('data', (chunk) => {
                data += chunk
              })
              res.on('end', async () => {
                const fileContents = fs.readFileSync(path.join(__dirname, attachmentFilename), 'binary')
                assert.strictEqual(data, fileContents)

                seenEmails++
                if (seenEmails === 2) {
                  await waitMailDevShutdown(maildev)
                  maildev.removeAllListeners()
                  await transporter.close()
                  resolve()
                }
              })
            }).on('error', function (err) {
              resolve(err)
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
