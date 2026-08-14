import { describe, it, expect, afterEach } from 'vitest'
import net from 'node:net'
import http from 'node:http'
import https from 'node:https'
import { normalizeBasePath, resolveHealthcheck, runHealthcheck } from '../../bin/healthcheck.js'

// Self-signed cert/key (CN=localhost, SAN 127.0.0.1) used only to exercise the
// HTTPS probe path. runHealthcheck must accept it despite it being self-signed.
const TEST_CERT = `-----BEGIN CERTIFICATE-----
MIICyzCCAbOgAwIBAgIJAO2mr+hKyLhqMA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNV
BAMMCWxvY2FsaG9zdDAgFw0yNjA4MTMxNTMwMjlaGA8yMTI2MDcyMDE1MzAyOVow
FDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAs2H0jSOISExuEhhDPmPZ6LdBydA+aPEAYu43ZQ05urkk36o7v74dYRQ7
yDo19mZ+jWLiIU3vtNSu32SlCLY8JJnkZmr0PLLCgLzo4Vy+HCQMQtaOnIP1mxQq
wKgGDSZUkpBM2kl2cLrE39mY8B1ezxgTU0Kx/PSdTVAragLJvEaUmo504WhuCV0q
FmVRbcUV8a5r/XuJRCDEmWmx8+nQC1JErUGigfkiMzP+g6mHjbpqgHAS27Zk5Fii
M27FHW8Wyrt7iuWp+xZOHLPPEee+EPc+Su80eV/A8y44NHHshK11zedZCUYjA7A9
H7R76FdgCY8qJ7Tl4qeiFhME2bN/UQIDAQABox4wHDAaBgNVHREEEzARgglsb2Nh
bGhvc3SHBH8AAAEwDQYJKoZIhvcNAQELBQADggEBAEurRUiZiSgkmw46Q5mgVX3Y
VIDou4xi/rl8WFgeqQmXQcZLnCOrKe9/BwCED22fzRkmgT6YWgenXUI21iKsHHOy
RagC95ZcQXMjUN1viDgGMJULJn7WrBQ6nPmV7uDz6rlqrC2c+OaLTaPOBlkEMui3
nbWzLu89eFOpXH1g+DSea8kUXUTCUvVOjcwPP7OgVQItI5ZYWsEKSihT+yhv8ujO
gidGrRsC0bSpUdXqOsnQjA5VNPIIYsrUys38mjwCVhppWkMS6LB8mArEadg+u4UR
8b1dl3UG21pgU/qf5FynB79g9WOWKdxriybyGUHEfC63PtuR5eFH6tjBEKvINCQ=
-----END CERTIFICATE-----`
const TEST_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCzYfSNI4hITG4S
GEM+Y9not0HJ0D5o8QBi7jdlDTm6uSTfqju/vh1hFDvIOjX2Zn6NYuIhTe+01K7f
ZKUItjwkmeRmavQ8ssKAvOjhXL4cJAxC1o6cg/WbFCrAqAYNJlSSkEzaSXZwusTf
2ZjwHV7PGBNTQrH89J1NUCtqAsm8RpSajnThaG4JXSoWZVFtxRXxrmv9e4lEIMSZ
abHz6dALUkStQaKB+SIzM/6DqYeNumqAcBLbtmTkWKIzbsUdbxbKu3uK5an7Fk4c
s88R574Q9z5K7zR5X8DzLjg0ceyErXXN51kJRiMDsD0ftHvoV2AJjyontOXip6IW
EwTZs39RAgMBAAECggEAWDQlTLUZEPvL78fQYMA2aPCbP8HOvkkquHqL8HtVVJQv
Jm+NW5X+2jpZvvWojRUOyzTBHkE1ScR+jEfvwl3hKtok7ZtPpvz7GNRK6m1w6WNs
R/06OInGXc/Hyd2UxCiB02Ny9q7Ct2GO5scXJZI7iTc8YWddH5WkN1zhTAo86f8z
bH3ImMBZQLeDQGzyMTGOOhlCAWgbRbnUPGpOXnmV24V/6/nNZ4iiNYC4bAPnmJfa
FaFZNxLJwfT7G5k+i1MKPyYDmpTz7ToNdX98u6ALhtsa3D5P1oFwnnvfHv8FOlDo
yaIcuSL4IdL4Js0El/hJR1feGdgID/ChBix1Kvc8AQKBgQDkbxAPLLCrwFKaqExK
lJxRVQI8KwN6RlOyXiFD/dmtIIRmIMoKixnNe557A0ZGb6Se6ksTkhwyXT2kxw9s
mOIjW/J3Tqf6q0IpNMK6EDdSpR91JyPg1/zi5oGjz+QD35Ct3nr8YJiyNdms2uXk
w/VNTCmlW57dSZKF1o6tc4uRwQKBgQDJB5GU6emHaSdBOHEC2/UkxUmDBBA5JPT5
lj87X+c4ru0kU4aW0VYEufnNFxfsU2MDz7JG7rCFkeVJedfJKUSLH+noQl6RzEQS
WiGaYUJJ6+3jeM2bIxiQmD+zS+sdmRNyIFH+FPdwLZiVYvo9hjtoNrv2n4jFhptZ
yv8TYMAxkQKBgQChjJoC4UwgaucAUT2DEQ5rxn7KJnFTLCFM550HBKPI+FIqF85L
Hoyk8WPnAy3T6mi1qmRl9tLSG3bY7Z5O4uAquYAEODA76pnjoliEVauKWxSgOYn6
HUXPAc11GDTdOGKNU+YOThIvFj5XLIeg/aShgdeCBgWX4cwpss88g5aVAQKBgQDF
1uYGKIIEGo9gV1yY1MGYE3S6NJiGtIFG0/+cvlA+76BAPNdau9+svR5DIXQQxyvN
x2yK9ELS4PdG7VtZBH0JcjnvssmBMQbZDMy/MvJa745pbCzkfZCiVMNz/8X+lfSW
P4qRxC6TvrvIYOUnAWCbuioXl3+x7TwcDXQkrPXYkQKBgQDZfwlUVqCbZ/nYtp0R
4lT89ClPa4clcrk/JDbnJA2/dwVh8kLh+Pzwlrwzpk3RHbXG/nFkoHkJvohSaY1A
CcooVDXRBK3rhxSde+AtWkBoKLUKqYVhLsrTG7ys+u90SgBcCkih1LqIxj743GrK
lXmoSjQVGK2M07xW7Bh7PbgK+Q==
-----END PRIVATE KEY-----`

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
      secure: false,
    })
  })

  it('honors the configured web port and base path', () => {
    expect(resolveHealthcheck({ MAILDEV_WEB_PORT: '8080', MAILDEV_BASE_PATHNAME: '/mail/' })).toEqual({
      mode: 'web',
      host: '127.0.0.1',
      port: 8080,
      path: '/mail/api/healthz',
      secure: false,
    })
  })

  it('probes over HTTPS when MAILDEV_HTTPS is set', () => {
    expect(resolveHealthcheck({ MAILDEV_HTTPS: 'true' })).toMatchObject({ mode: 'web', secure: true })
    expect(resolveHealthcheck({ MAILDEV_HTTPS: '1' }).secure).toBe(true)
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

  it('returns true probing an HTTPS endpoint with a self-signed cert', async () => {
    const server = https.createServer({ cert: TEST_CERT, key: TEST_KEY }, (req, res) => {
      res.statusCode = req.url === '/api/healthz' ? 200 : 404
      res.end()
    })
    const port = await listen(server)
    expect(await runHealthcheck({ MAILDEV_WEB_PORT: String(port), MAILDEV_HTTPS: 'true' })).toBe(true)
  })

  it('returns false when probing HTTPS but the server only speaks HTTP', async () => {
    const server = http.createServer((_req, res) => res.end())
    const port = await listen(server)
    expect(await runHealthcheck({ MAILDEV_WEB_PORT: String(port), MAILDEV_HTTPS: 'true' })).toBe(false)
  })

  it('returns true when the SMTP port accepts a connection (web disabled)', async () => {
    const server = net.createServer((socket) => socket.end())
    const port = await listen(server)
    expect(
      await runHealthcheck({ MAILDEV_DISABLE_WEB: 'true', MAILDEV_SMTP_PORT: String(port) })
    ).toBe(true)
  })
})
