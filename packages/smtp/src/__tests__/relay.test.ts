import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createReadStream } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import net, { type AddressInfo } from 'node:net'
import nodemailer from 'nodemailer'
import { SMTPServer as SMTPServerLib } from 'smtp-server'
import { MemoryStorage, FileStorage, type Email } from '@maildev/core'
import { SMTPServer } from '../server.js'
import { RelayClient } from '../relay.js'

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

describe('relay delivery status', () => {
  let sourceDir: string
  let destDir: string
  let sourceStore: MemoryStorage
  let destStore: MemoryStorage
  let source: SMTPServer
  let dest: SMTPServer
  let sourcePort: number
  let destPort: number

  beforeEach(async () => {
    sourceDir = await mkdtemp(join(tmpdir(), 'maildev-relay-src-'))
    destDir = await mkdtemp(join(tmpdir(), 'maildev-relay-dst-'))
    sourceStore = new MemoryStorage()
    destStore = new MemoryStorage()
    await sourceStore.initialize()
    await destStore.initialize()
    sourcePort = await freePort()
    destPort = await freePort()

    dest = new SMTPServer({ storage: destStore, mailDir: destDir, port: destPort, host: '127.0.0.1' })
    await dest.start()

    source = new SMTPServer({ storage: sourceStore, mailDir: sourceDir, port: sourcePort, host: '127.0.0.1' })
    await source.start()
    source.setupRelay({ host: '127.0.0.1', port: destPort, secure: false })
    source.setAutoRelay({ enabled: true })
  })

  afterEach(async () => {
    await source.stop()
    await dest.stop()
    await rm(sourceDir, { recursive: true, force: true })
    await rm(destDir, { recursive: true, force: true })
  })

  const sendTo = (port: number) => {
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port, secure: false })
    return transport.sendMail({
      from: 'a@example.com',
      to: 'b@example.com',
      subject: 'relay me',
      text: 'hello',
    })
  }

  it('records relayedAt and relayedTo on the stored email after an auto-relay', async () => {
    await sendTo(sourcePort)

    const stored = (await sourceStore.getAll())[0]!
    expect(stored.relayedAt).toBeInstanceOf(Date)
    expect(stored.relayedTo).toContain('b@example.com')

    // The relay actually delivered it downstream.
    expect(await destStore.getAll()).toHaveLength(1)
  })

  it('leaves relayedAt unset for an email that was never relayed', async () => {
    await sendTo(destPort)

    const stored = (await destStore.getAll())[0]!
    expect(stored.relayedAt).toBeUndefined()
    expect(stored.relayedTo).toBeUndefined()
  })

  it('restores relay status from disk on a fresh FileStorage-backed server', async () => {
    // Use a disk-backed source so the relay status is persisted to a sidecar.
    await source.stop()
    const fileStore = new FileStorage({ mailDirectory: sourceDir })
    await fileStore.initialize()
    source = new SMTPServer({ storage: fileStore, mailDir: sourceDir, port: sourcePort, host: '127.0.0.1' })
    await source.start()
    source.setupRelay({ host: '127.0.0.1', port: destPort, secure: false })
    source.setAutoRelay({ enabled: true })

    await sendTo(sourcePort)
    const id = (await fileStore.getAll())[0]!.id
    expect((await fileStore.getById(id))!.relayedAt).toBeInstanceOf(Date)

    // Simulate a restart: a brand-new store + server reading the same directory.
    await source.stop()
    const restoredStore = new FileStorage({ mailDirectory: sourceDir })
    await restoredStore.initialize()
    source = new SMTPServer({ storage: restoredStore, mailDir: sourceDir, port: sourcePort, host: '127.0.0.1' })
    await source.loadMailsFromDirectory()

    const restored = (await restoredStore.getById(id))!
    expect(restored.relayedAt).toBeInstanceOf(Date)
    expect(restored.relayedTo).toContain('b@example.com')
  })
})

describe('relay raw email stream', () => {
  let dir: string
  let emlPath: string

  const email = {
    id: 'leak0001',
    subject: 'relay me',
    envelope: {
      from: { address: 'a@example.com' },
      to: [{ address: 'b@example.com' }],
    },
  } as Email

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'maildev-relay-stream-'))
    emlPath = join(dir, `${email.id}.eml`)
    await writeFile(emlPath, 'Subject: relay me\r\n\r\nhello\r\n')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('closes the stream when rules leave no recipients', async () => {
    const client = new RelayClient({ host: '127.0.0.1', port: await freePort() }, false)
    client.setAutoRelay({ enabled: true, rules: [{ deny: '*' }] })
    const stream = createReadStream(emlPath)

    const result = await client.relay(email, stream, true)

    expect(result.success).toBe(false)
    expect(stream.destroyed).toBe(true)
  })

  it('closes the stream when the outgoing server rejects the recipient', async () => {
    const port = await freePort()
    const rejecting = new SMTPServerLib({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      onRcptTo(_address, _session, callback) {
        callback(new Error('Recipient rejected'))
      },
    })
    await new Promise<void>((resolve) => rejecting.listen(port, '127.0.0.1', resolve))

    try {
      const client = new RelayClient({ host: '127.0.0.1', port }, false)
      const stream = createReadStream(emlPath)

      const result = await client.relay(email, stream)

      expect(result.success).toBe(false)
      expect(stream.destroyed).toBe(true)
    } finally {
      await new Promise<void>((resolve) => rejecting.close(() => resolve()))
    }
  })
})
