import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
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

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>'

describe('inline cid rewriting through the full SMTP flow', () => {
  let mailDir: string
  let storage: MemoryStorage
  let server: SMTPServer
  let port: number

  beforeEach(async () => {
    mailDir = await mkdtemp(join(tmpdir(), 'maildev-inline-cid-'))
    storage = new MemoryStorage()
    await storage.initialize()
    port = await freePort()
    server = new SMTPServer({ storage, mailDir, port, host: '127.0.0.1' })
    await server.start()
  })

  afterEach(async () => {
    await server.stop()
    await rm(mailDir, { recursive: true, force: true })
  })

  const sendInlineSvg = () => {
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port, secure: false })
    return transport.sendMail({
      from: 'a@example.com',
      to: 'b@example.com',
      subject: 'inline svg',
      html: '<html><body><img src="cid:svg-part@maildev.test" alt="svg"></body></html>',
      attachments: [
        {
          filename: 'logo.svg',
          contentType: 'image/svg+xml',
          contentDisposition: 'inline',
          cid: 'svg-part@maildev.test',
          content: Buffer.from(SVG),
        },
      ],
    })
  }

  /**
   * mailparser keeps the angle brackets in `attachment.contentId` and does not
   * inline `image/svg+xml` cids as data URIs (its image regex rejects the `+`),
   * so the html keeps a literal `cid:` src that must be rewritten against the
   * stored attachment. See #583.
   */
  it('rewrites the surviving svg cid to the attachment URL and serves the file', async () => {
    await sendInlineSvg()

    const emails = await storage.getAll()
    expect(emails).toHaveLength(1)
    const email = emails[0]!

    expect(email.attachments).toHaveLength(1)
    const inlineAttachment = email.attachments[0]!
    expect(inlineAttachment.contentId).toBe('svg-part@maildev.test')

    const html = await server.getEmailHtml(email.id)
    expect(html).not.toContain('cid:')
    const src = html!.match(/src="([^"]+)"/)?.[1]
    expect(src).toBe(
      `/api/email/${email.id}/attachment/${encodeURIComponent(inlineAttachment.generatedFileName)}`
    )

    const attachment = await server.getEmailAttachment(email.id, inlineAttachment.generatedFileName)
    expect(attachment.contentType).toBe('image/svg+xml')

    const chunks: Buffer[] = []
    for await (const chunk of attachment.stream) {
      chunks.push(chunk as Buffer)
    }
    expect(Buffer.concat(chunks).toString()).toBe(SVG)
  })

  it('prefixes the rewritten attachment URL with the configured base path', async () => {
    await sendInlineSvg()

    const email = (await storage.getAll())[0]!

    const html = await server.getEmailHtml(email.id, { basePath: '/mail' })
    expect(html).not.toContain('cid:')
    expect(html).toContain(
      `src="/mail/api/email/${email.id}/attachment/${email.attachments[0]!.generatedFileName}"`
    )
  })
})