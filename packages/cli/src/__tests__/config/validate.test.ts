import { describe, it, expect } from 'vitest'
import { validateConfig, formatValidationErrors } from '../../config/validate.js'
import { getDefaultConfig } from '../../config/defaults.js'
import type { MailDevConfig } from '../../config/types.js'

describe('validateConfig', () => {
  const createConfig = (overrides: Partial<MailDevConfig> = {}): MailDevConfig => ({
    ...getDefaultConfig(),
    ...overrides,
  })

  describe('valid configurations', () => {
    it('should accept default configuration', () => {
      const result = validateConfig(getDefaultConfig())
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept valid custom ports', () => {
      const config = createConfig({ smtp: 2025, web: 3080 })
      const result = validateConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should accept valid authentication config', () => {
      const config = createConfig({
        incomingUser: 'user',
        incomingPass: 'pass',
        webUser: 'admin',
        webPass: 'secret',
      })
      const result = validateConfig(config)
      expect(result.valid).toBe(true)
    })
  })

  describe('port validation', () => {
    it('should reject invalid SMTP port (too low)', () => {
      const config = createConfig({ smtp: 0 })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'smtp')).toBe(true)
    })

    it('should reject invalid SMTP port (too high)', () => {
      const config = createConfig({ smtp: 70000 })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'smtp')).toBe(true)
    })

    it('should reject invalid web port', () => {
      const config = createConfig({ web: -1 })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'web')).toBe(true)
    })

    it('should reject non-integer ports', () => {
      const config = createConfig({ smtp: 1025.5 })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
    })
  })

  describe('authentication validation', () => {
    it('should require password when username is set (SMTP)', () => {
      const config = createConfig({ incomingUser: 'user' })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'incomingPass')).toBe(true)
    })

    it('should require username when password is set (SMTP)', () => {
      const config = createConfig({ incomingPass: 'pass' })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'incomingUser')).toBe(true)
    })

    it('should require password when username is set (Web)', () => {
      const config = createConfig({ webUser: 'admin' })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'webPass')).toBe(true)
    })

    it('should require username when password is set (Web)', () => {
      const config = createConfig({ webPass: 'secret' })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'webUser')).toBe(true)
    })
  })

  describe('TLS validation', () => {
    it('should require cert when incomingSecure is enabled', () => {
      const config = createConfig({ incomingSecure: true })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'incomingCert')).toBe(true)
    })

    it('should require key when incomingSecure is enabled', () => {
      const config = createConfig({ incomingSecure: true })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'incomingKey')).toBe(true)
    })

    it('should require cert when https is enabled', () => {
      const config = createConfig({ https: true })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'httpsCert')).toBe(true)
    })

    it('should require key when https is enabled', () => {
      const config = createConfig({ https: true })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'httpsKey')).toBe(true)
    })
  })

  describe('warnings', () => {
    it('should warn when SMTP and web ports are the same', () => {
      const config = createConfig({ smtp: 8080, web: 8080 })
      const result = validateConfig(config)
      expect(result.warnings.some((w) => w.includes('same'))).toBe(true)
    })

    it('should warn when both verbose and silent are enabled', () => {
      const config = createConfig({ verbose: true, silent: true })
      const result = validateConfig(config)
      expect(result.warnings.some((w) => w.includes('verbose') && w.includes('silent'))).toBe(true)
    })

    it('should warn when web auth is configured but web is disabled', () => {
      const config = createConfig({
        disableWeb: true,
        webUser: 'admin',
        webPass: 'secret',
      })
      const result = validateConfig(config)
      expect(result.warnings.some((w) => w.includes('disabled'))).toBe(true)
    })

    it('should warn when MCP is enabled but web is disabled', () => {
      const config = createConfig({ disableWeb: true, mcp: true })
      const result = validateConfig(config)
      expect(result.warnings.some((w) => w.includes('MCP'))).toBe(true)
    })
  })
})

describe('formatValidationErrors', () => {
  it('should format errors correctly', () => {
    const result = {
      valid: false,
      errors: [
        { field: 'smtp', message: 'Invalid port' },
        { field: 'web', message: 'Invalid port' },
      ],
      warnings: [],
    }

    const formatted = formatValidationErrors(result)
    expect(formatted).toContain('Configuration errors:')
    expect(formatted).toContain('smtp')
    expect(formatted).toContain('web')
    expect(formatted).toContain('Invalid port')
  })

  it('should format warnings correctly', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: ['Port conflict warning'],
    }

    const formatted = formatValidationErrors(result)
    expect(formatted).toContain('Warnings:')
    expect(formatted).toContain('Port conflict warning')
  })

  it('should format both errors and warnings', () => {
    const result = {
      valid: false,
      errors: [{ field: 'smtp', message: 'Invalid' }],
      warnings: ['Some warning'],
    }

    const formatted = formatValidationErrors(result)
    expect(formatted).toContain('Configuration errors:')
    expect(formatted).toContain('Warnings:')
  })

  it('should return empty string for valid config with no warnings', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    }

    const formatted = formatValidationErrors(result)
    expect(formatted).toBe('')
  })
})
