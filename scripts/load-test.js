
/**
 * MailDev - load-test.js -- start a load test
 *
 * Run this to send a lot of emails in very short intervals to port 1025 for load testing MailDev during development
 *   node test/scripts/load-test.js
 */

const async = require('async')
const nodemailer = require('nodemailer')

// Create a transport with MailDev's default receiving port
var transporter = nodemailer.createTransport({
  port: 1025,
  ignoreTLS: true
})

// Messages list
var messages = [
  {
    from: 'Angelo Pappas <angelo.pappas@fbi.gov>',
    to: 'Johnny Utah <johnny.utah@fbi.gov>',
    subject: '100% pure adrenaline!',
    headers: {
      'X-some-header': 1000
    },
    text: 'They only live to get radical.',
    html: '<!DOCTYPE html><html><head></head><body>' +
          '<p>They only live to get radical.</p>' +
          '</body></html>',
    attachments: [
      { fileName: 'stimulating.txt', content: 'Stimulating', contentType: 'text/plain' }
    ]
  }
]

let count = 0
let timeout

async function sendMessages () {
  try {
    for (const message of messages) {
      const result = await transporter.sendMail(message)
      count++
      console.log(`[${count}] Test email sent: `, result.response)
    }
  } catch (error) {
    console.log(`[${count}] Test email error: `, error)
    clearTimeout(timeout)
  }
}

function loadTest (parallel = 500, delay = 10, limit = null) {
  timeout = setTimeout(async function () {
    await async.times(parallel, sendMessages)
    if (!limit || count <= limit) loadTest()
    else clearTimeout(timeout)
  }, delay)
}

// Run once if called directly, otherwise export
if (require.main === module) { loadTest() } else { module.exports = loadTest }
