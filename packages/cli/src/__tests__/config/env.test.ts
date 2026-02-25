import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadEnvConfig, getEnvVarName } from '../../config/env.js'

describe('loadEnvConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return empty config when no env vars set', () => {
    // Clear relevant env vars
    delete process.env.MAILDEV_SMTP_PORT
    delete process.env.MAILDEV_WEB_PORT
    delete process.env.MAILDEV_IP

    const config = loadEnvConfig()
    expect(config.smtp).toBeUndefined()
    expect(config.web).toBeUndefined()
  })

  it('should parse MAILDEV_SMTP_PORT as number', () => {
    process.env.MAILDEV_SMTP_PORT = '2025'

    const config = loadEnvConfig()
    expect(config.smtp).toBe(2025)
    expect(typeof config.smtp).toBe('number')
  })

  it('should parse MAILDEV_WEB_PORT as number', () => {
    process.env.MAILDEV_WEB_PORT = '3080'

    const config = loadEnvConfig()
    expect(config.web).toBe(3080)
  })

  it('should load MAILDEV_IP as string', () => {
    process.env.MAILDEV_IP = '127.0.0.1'

    const config = loadEnvConfig()
    expect(config.ip).toBe('127.0.0.1')
  })

  it('should load MAILDEV_WEB_IP as string', () => {
    process.env.MAILDEV_WEB_IP = '192.168.1.1'

    const config = loadEnvConfig()
    expect(config.webIp).toBe('192.168.1.1')
  })

  it('should load authentication env vars', () => {
    process.env.MAILDEV_INCOMING_USER = 'smtp_user'
    process.env.MAILDEV_INCOMING_PASS = 'smtp_pass'
    process.env.MAILDEV_WEB_USER = 'web_user'
    process.env.MAILDEV_WEB_PASS = 'web_pass'

    const config = loadEnvConfig()
    expect(config.incomingUser).toBe('smtp_user')
    expect(config.incomingPass).toBe('smtp_pass')
    expect(config.webUser).toBe('web_user')
    expect(config.webPass).toBe('web_pass')
  })

  it('should load outgoing relay env vars', () => {
    process.env.MAILDEV_OUTGOING_HOST = 'smtp.example.com'
    process.env.MAILDEV_OUTGOING_PORT = '587'
    process.env.MAILDEV_OUTGOING_USER = 'relay_user'
    process.env.MAILDEV_OUTGOING_PASS = 'relay_pass'

    const config = loadEnvConfig()
    expect(config.outgoingHost).toBe('smtp.example.com')
    expect(config.outgoingPort).toBe(587)
    expect(config.outgoingUser).toBe('relay_user')
    expect(config.outgoingPass).toBe('relay_pass')
  })

  it('should load MAILDEV_MAIL_DIRECTORY', () => {
    process.env.MAILDEV_MAIL_DIRECTORY = '/var/mail'

    const config = loadEnvConfig()
    expect(config.mailDirectory).toBe('/var/mail')
  })

  it('should load MAILDEV_BASE_PATHNAME', () => {
    process.env.MAILDEV_BASE_PATHNAME = '/mail/'

    const config = loadEnvConfig()
    expect(config.basePathname).toBe('/mail/')
  })

  it('should ignore invalid port numbers', () => {
    process.env.MAILDEV_SMTP_PORT = 'not-a-number'

    const config = loadEnvConfig()
    expect(config.smtp).toBeUndefined()
  })

  it('should handle multiple env vars simultaneously', () => {
    process.env.MAILDEV_SMTP_PORT = '2025'
    process.env.MAILDEV_WEB_PORT = '3080'
    process.env.MAILDEV_IP = '0.0.0.0'
    process.env.MAILDEV_MAIL_DIRECTORY = '/tmp/mail'

    const config = loadEnvConfig()
    expect(config.smtp).toBe(2025)
    expect(config.web).toBe(3080)
    expect(config.ip).toBe('0.0.0.0')
    expect(config.mailDirectory).toBe('/tmp/mail')
  })
})

describe('getEnvVarName', () => {
  it('should return env var name for smtp', () => {
    expect(getEnvVarName('smtp')).toBe('MAILDEV_SMTP_PORT')
  })

  it('should return env var name for web', () => {
    expect(getEnvVarName('web')).toBe('MAILDEV_WEB_PORT')
  })

  it('should return env var name for ip', () => {
    expect(getEnvVarName('ip')).toBe('MAILDEV_IP')
  })

  it('should return env var name for mailDirectory', () => {
    expect(getEnvVarName('mailDirectory')).toBe('MAILDEV_MAIL_DIRECTORY')
  })

  it('should return null for unmapped config keys', () => {
    expect(getEnvVarName('mcp')).toBeNull()
    expect(getEnvVarName('verbose')).toBeNull()
  })
})
