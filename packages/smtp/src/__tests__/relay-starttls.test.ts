import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import nodemailer from 'nodemailer'
import { SMTPServer as SMTPServerLib } from 'smtp-server'
import { MemoryStorage } from '@maildev/core'
import { SMTPServer } from '../server.js'

describe('relay STARTTLS', () => {
  let mailDir: string
  let storage: MemoryStorage
  let source: SMTPServer
  let upstream: SMTPServerLib
  let upstreamPort: number
  // `session.secure` of every message the upstream server received
  let deliveries: boolean[]

  beforeEach(async () => {
    mailDir = await mkdtemp(join(tmpdir(), 'maildev-relay-tls-'))
    storage = new MemoryStorage()
    await storage.initialize()
    deliveries = []

    // A plain-port relay that advertises STARTTLS, like a submission server on 587.
    upstream = new SMTPServerLib({
      authOptional: true,
      logger: false,
      onData(stream, session, callback) {
        deliveries.push(session.secure)
        stream.on('end', () => callback())
        stream.resume()
      },
    })
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', () => resolve()))
    upstreamPort = (upstream.server.address() as AddressInfo).port

    source = new SMTPServer({ storage, mailDir, port: 0, host: '127.0.0.1' })
    await source.start()
  })

  afterEach(async () => {
    await source.stop()
    await new Promise<void>((resolve) => upstream.close(() => resolve()))
    await rm(mailDir, { recursive: true, force: true })
  })

  const send = () => {
    const transport = nodemailer.createTransport({
      host: '127.0.0.1',
      port: source.getPort(),
      secure: false,
    })
    return transport.sendMail({
      from: 'a@example.com',
      to: 'b@example.com',
      subject: 'relay me',
      text: 'hello',
    })
  }

  it('upgrades the relay connection with STARTTLS when the server offers it', async () => {
    source.setupRelay({ host: '127.0.0.1', port: upstreamPort, secure: false })
    source.setAutoRelay({ enabled: true })

    await send()

    expect(deliveries).toEqual([true])
  })

  it('stays on cleartext with ignoreTLS even when the server offers STARTTLS', async () => {
    source.setupRelay({ host: '127.0.0.1', port: upstreamPort, secure: false, ignoreTLS: true })
    source.setAutoRelay({ enabled: true })

    await send()

    expect(deliveries).toEqual([false])
  })
})
