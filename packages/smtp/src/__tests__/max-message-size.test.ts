import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import net, { type AddressInfo } from 'node:net'
import nodemailer from 'nodemailer'
import { MemoryStorage } from '@maildev/core'
import { SMTPServer } from '../server.js'

/** Grab an ephemeral free port so parallel test files don't collide. */
function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as AddressInfo).port
      srv.close(() => resolve(port))
    })
  })
}

const MAX_SIZE = 2000

describe('maxMessageSize enforcement', () => {
  let mailDir: string
  let storage: MemoryStorage
  let server: SMTPServer
  let port: number

  beforeEach(async () => {
    mailDir = await mkdtemp(join(tmpdir(), 'maildev-size-'))
    storage = new MemoryStorage()
    await storage.initialize()
    port = await freePort()
    server = new SMTPServer({ storage, mailDir, port, host: '127.0.0.1', maxMessageSize: MAX_SIZE })
    await server.start()
  })

  afterEach(async () => {
    await server.stop()
    await rm(mailDir, { recursive: true, force: true })
  })

  const send = (text: string) => {
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port, secure: false })
    return transport.sendMail({
      from: 'a@example.com',
      to: 'b@example.com',
      subject: 'test',
      text,
    })
  }

  it('accepts a message under the limit and stores it', async () => {
    await send('a short body')
    expect(await storage.getAll()).toHaveLength(1)
  })

  it('rejects a message over the limit and stores nothing', async () => {
    await expect(send('x'.repeat(MAX_SIZE * 4))).rejects.toThrow()

    expect(await storage.getAll()).toHaveLength(0)
    // No partial .eml file left behind for the rejected message.
    const files = (await readdir(mailDir)).filter((f) => f.endsWith('.eml'))
    expect(files).toHaveLength(0)
  })

  // Exercises the DATA-stream cap directly: a client that does NOT declare
  // SIZE at MAIL FROM (as an attacker wouldn't) still gets bounded and rejected
  // once the body runs past the limit, rather than tying up the parser.
  it('caps and rejects an oversized body sent without a declared SIZE', async () => {
    const boundary = 'b'
    const part = `--${boundary}\r\nContent-Type: text/plain\r\n\r\nx\r\n`
    const body =
      [
        'From: a@example.com',
        'To: b@example.com',
        'Subject: fanout',
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        '',
      ].join('\r\n') +
      part.repeat(5000) + // ~200 KB, well over MAX_SIZE
      `--${boundary}--\r\n`

    const reply = await rawSmtp(port, body)
    expect(reply).toMatch(/^552 /)
    expect(await storage.getAll()).toHaveLength(0)
    const files = (await readdir(mailDir)).filter((f) => f.endsWith('.eml'))
    expect(files).toHaveLength(0)
  })
})

/**
 * Minimal raw SMTP client that delivers `body` without declaring SIZE, and
 * resolves with the final reply to end-of-DATA.
 */
function rawSmtp(port: number, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(port, '127.0.0.1')
    sock.setEncoding('utf8')
    sock.setTimeout(10000, () => {
      sock.destroy()
      reject(new Error('SMTP timeout'))
    })
    const script = ['EHLO test', 'MAIL FROM:<a@example.com>', 'RCPT TO:<b@example.com>', 'DATA']
    let buf = ''
    const waiters: Array<(reply: string) => void> = []
    const pump = () => {
      const m = buf.match(/^\d{3} [^\r\n]*\r\n/m)
      if (m && waiters.length) {
        const end = buf.indexOf(m[0]) + m[0].length
        const reply = buf.slice(0, end).trim()
        buf = buf.slice(end)
        waiters.shift()!(reply)
      }
    }
    const expectReply = () => new Promise<string>((res) => { waiters.push(res); pump() })
    sock.on('data', (d) => { buf += d; pump() })
    sock.on('error', reject)
    ;(async () => {
      await expectReply() // greeting
      for (const line of script) {
        sock.write(line + '\r\n')
        await expectReply()
      }
      sock.write(body + '\r\n.\r\n')
      const final = await expectReply()
      sock.write('QUIT\r\n')
      sock.end()
      resolve(final)
    })().catch(reject)
  })
}
