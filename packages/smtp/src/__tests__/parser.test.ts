import { describe, it, expect } from 'vitest'
import { parseEmailBuffer } from '../parser.js'

describe('parseEmailBuffer attachment contentId', () => {
  it('stores the bare contentId stripped of the Content-ID angle brackets', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>')
    const raw = [
      'From: sender@example.com',
      'To: recipient@example.com',
      'Subject: inline svg',
      'MIME-Version: 1.0',
      'Content-Type: multipart/related; boundary="b"',
      '',
      '--b',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<html><body><img src="cid:logo@maildev.test" alt="svg"></body></html>',
      '--b',
      'Content-Type: image/svg+xml',
      'Content-Disposition: inline',
      'Content-ID: <logo@maildev.test>',
      'Content-Transfer-Encoding: base64',
      '',
      svg.toString('base64'),
      '--b--',
      '',
    ].join('\r\n')

    const parsed = await parseEmailBuffer(raw)

    const attachments = parsed.attachments ?? []
    expect(attachments).toHaveLength(1)
    expect(attachments[0]!.contentId).toBe('logo@maildev.test')
  })

  it('keeps a bare contentId unchanged', async () => {
    const raw = [
      'From: sender@example.com',
      'To: recipient@example.com',
      'Subject: inline png',
      'MIME-Version: 1.0',
      'Content-Type: multipart/related; boundary="b"',
      '',
      '--b',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<html><body><img src="cid:logo" alt="png"></body></html>',
      '--b',
      'Content-Type: image/png',
      'Content-Disposition: inline',
      'Content-ID: logo',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from('png').toString('base64'),
      '--b--',
      '',
    ].join('\r\n')

    const parsed = await parseEmailBuffer(raw)

    const attachments = parsed.attachments ?? []
    expect(attachments).toHaveLength(1)
    expect(attachments[0]!.contentId).toBe('logo')
  })
})