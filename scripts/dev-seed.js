const net = require('net')
const sendEmails = require('./send.js')

const PORT = 1025
const HOST = '127.0.0.1'
const RETRY_MS = 200
const MAX_RETRIES = 50

function waitForSmtp (retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const sock = net.connect(PORT, HOST)
      sock.once('connect', () => { sock.end(); resolve() })
      sock.once('error', () => {
        sock.destroy()
        if (--retries <= 0) return reject(new Error(`SMTP port ${PORT} not reachable`))
        setTimeout(tryConnect, RETRY_MS)
      })
    }
    tryConnect()
  })
}

waitForSmtp()
  .then(() => sendEmails(true))
  .catch((err) => console.error('[dev-seed]', err.message))
