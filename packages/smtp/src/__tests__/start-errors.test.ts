import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import net, { type AddressInfo } from 'node:net'
import { MemoryStorage } from '@maildev/core'
import { SMTPServer } from '../server.js'

/** Drive smtp-server's 'error' event, the same path handleServerError listens on. */
function emitSmtpError(server: SMTPServer, err: NodeJS.ErrnoException): void {
  const smtpLib = (
    server as unknown as {
      smtp: { emit: (event: 'error', err: NodeJS.ErrnoException) => void }
    }
  ).smtp
  smtpLib.emit('error', err)
}

describe('SMTPServer start() errors', () => {
  let mailDir: string
  let storage: MemoryStorage
  let server: SMTPServer | undefined
  let occupant: net.Server | undefined

  beforeEach(async () => {
    mailDir = await mkdtemp(join(tmpdir(), 'maildev-start-err-'))
    storage = new MemoryStorage()
    await storage.initialize()
  })

  afterEach(async () => {
    await server?.stop()
    if (occupant) {
      await new Promise<void>((resolve, reject) => {
        occupant!.close((err) => (err ? reject(err) : resolve()))
      })
      occupant = undefined
    }
    await rm(mailDir, { recursive: true, force: true })
  })

  it('rejects start() with EADDRINUSE when the SMTP port is already bound', async () => {
    occupant = net.createServer()
    await new Promise<void>((resolve) => {
      occupant!.listen(0, '127.0.0.1', () => resolve())
    })
    const port = (occupant.address() as AddressInfo).port

    const uncaught: Error[] = []
    const onUncaught = (err: Error) => {
      uncaught.push(err)
    }
    process.on('uncaughtException', onUncaught)

    try {
      server = new SMTPServer({
        storage,
        mailDir,
        port,
        host: '127.0.0.1',
        logger: false,
      })
      await expect(server.start()).rejects.toMatchObject({ code: 'EADDRINUSE' })
      await new Promise<void>((resolve) => setImmediate(resolve))
      expect(uncaught).toEqual([])
    } finally {
      process.removeListener('uncaughtException', onUncaught)
    }
  })

  it('does not throw from a post-listen server error when no error listener is attached', async () => {
    server = new SMTPServer({
      storage,
      mailDir,
      port: 0,
      host: '127.0.0.1',
      logger: false,
    })
    await server.start()

    const err = Object.assign(new Error('timeout'), {
      code: 'ETIMEDOUT',
    }) as NodeJS.ErrnoException
    expect(() => emitSmtpError(server!, err)).not.toThrow()
  })

  it('forwards post-listen errors to an error listener instead of throwing', async () => {
    server = new SMTPServer({
      storage,
      mailDir,
      port: 0,
      host: '127.0.0.1',
      logger: false,
    })
    await server.start()

    const seen: NodeJS.ErrnoException[] = []
    server.on('error', (e: NodeJS.ErrnoException) => {
      seen.push(e)
    })

    const err = Object.assign(new Error('timeout'), {
      code: 'ETIMEDOUT',
    }) as NodeJS.ErrnoException
    expect(() => emitSmtpError(server!, err)).not.toThrow()
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ code: 'ETIMEDOUT' })
  })
})
