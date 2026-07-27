import { describe, it, expect, afterEach } from 'vitest'
import net from 'node:net'
import http from 'node:http'
import { normalizeBasePath, resolveHealthcheck, runHealthcheck } from '../../bin/healthcheck.js'

describe('normalizeBasePath', () => {
  it('treats empty / root as no prefix', () => {
    expect(normalizeBasePath(undefined)).toBe('')
    expect(normalizeBasePath('')).toBe('')
    expect(normalizeBasePath('/')).toBe('')
  })

  it('strips trailing slashes so the probe URL never has a double slash', () => {
    expect(normalizeBasePath('/mail')).toBe('/mail')
    expect(normalizeBasePath('/mail/')).toBe('/mail')
    expect(normalizeBasePath('/mail///')).toBe('/mail')
  })

  it('adds a leading slash when missing', () => {
    expect(normalizeBasePath('mail')).toBe('/mail')
  })
})

describe('resolveHealthcheck', () => {
  it('probes the web healthz endpoint on 127.0.0.1 by default (not localhost)', () => {
    expect(resolveHealthcheck({})).toEqual({
      mode: 'web',
      host: '127.0.0.1',
      port: 1080,
      path: '/api/healthz',
    })
  })

  it('honors the configured web port and base path', () => {
    expect(resolveHealthcheck({ MAILDEV_WEB_PORT: '8080', MAILDEV_BASE_PATHNAME: '/mail/' })).toEqual({
      mode: 'web',
      host: '127.0.0.1',
      port: 8080,
      path: '/mail/api/healthz',
    })
  })

  it('probes the SMTP port when the web UI is disabled', () => {
    expect(resolveHealthcheck({ MAILDEV_DISABLE_WEB: 'true', MAILDEV_SMTP_PORT: '2525' })).toEqual({
      mode: 'smtp',
      host: '127.0.0.1',
      port: 2525,
    })
    // both accepted truthy forms
    expect(resolveHealthcheck({ MAILDEV_DISABLE_WEB: '1' }).mode).toBe('smtp')
  })
})

describe('runHealthcheck (integration)', () => {
  const servers: Array<http.Server | net.Server> = []

  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map((s) => new Promise<void>((resolve) => s.close(() => resolve())))
    )
  })

  const listen = (server: http.Server | net.Server): Promise<number> =>
    new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        servers.push(server)
        resolve((server.address() as net.AddressInfo).port)
      })
    })

  it('returns true when the web healthz endpoint responds 200', async () => {
    const server = http.createServer((req, res) => {
      res.statusCode = req.url === '/api/healthz' ? 200 : 404
      res.end()
    })
    const port = await listen(server)
    expect(await runHealthcheck({ MAILDEV_WEB_PORT: String(port) })).toBe(true)
  })

  it('returns false when the web endpoint is not reachable', async () => {
    // Nothing listening on this port.
    expect(await runHealthcheck({ MAILDEV_WEB_PORT: '1' })).toBe(false)
  })

  it('returns true when the SMTP port accepts a connection (web disabled)', async () => {
    const server = net.createServer((socket) => socket.end())
    const port = await listen(server)
    expect(
      await runHealthcheck({ MAILDEV_DISABLE_WEB: 'true', MAILDEV_SMTP_PORT: String(port) })
    ).toBe(true)
  })
})
