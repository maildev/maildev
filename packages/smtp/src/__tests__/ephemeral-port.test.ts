import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import nodemailer from 'nodemailer'
import { MemoryStorage } from '@maildev/core'
import { SMTPServer } from '../server.js'

describe('ephemeral port (port: 0)', () => {
  let mailDir: string
  let storage: MemoryStorage
  let server: SMTPServer

  beforeEach(async () => {
    mailDir = await mkdtemp(join(tmpdir(), 'maildev-port-'))
    storage = new MemoryStorage()
    await storage.initialize()
  })

  afterEach(async () => {
    await server.stop()
    await rm(mailDir, { recursive: true, force: true })
  })

  it('binds an OS-assigned port and exposes it via getAddress()/getPort()', async () => {
    server = new SMTPServer({ storage, mailDir, port: 0, host: '127.0.0.1' })
    await server.start()

    const { host, port } = server.getAddress()
    expect(host).toBe('127.0.0.1')
    expect(port).toBeGreaterThan(0)
    expect(server.getPort()).toBe(port)

    // The reported port is real: a message sent to it is received and stored.
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port, secure: false })
    await transport.sendMail({
      from: 'a@example.com',
      to: 'b@example.com',
      subject: 'ephemeral',
      text: 'hello',
    })
    expect(await storage.getAll()).toHaveLength(1)
  })

  it('gives each port: 0 server its own port instead of coercing to the default', async () => {
    // If `0` were treated as absent and replaced by DEFAULT_PORT, both servers
    // would try to bind the same fixed port and the second would EADDRINUSE.
    // Both succeeding on distinct ports proves `0` flows through as `0`.
    server = new SMTPServer({ storage, mailDir, port: 0, host: '127.0.0.1' })
    await server.start()

    const other = new SMTPServer({ storage, mailDir, port: 0, host: '127.0.0.1' })
    await other.start()
    try {
      expect(server.getPort()).toBeGreaterThan(0)
      expect(other.getPort()).toBeGreaterThan(0)
      expect(other.getPort()).not.toBe(server.getPort())
    } finally {
      await other.stop()
    }
  })
})
