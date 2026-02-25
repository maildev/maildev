import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG, getDefaultConfig } from '../../config/defaults.js'

describe('DEFAULT_CONFIG', () => {
  it('should have correct SMTP defaults', () => {
    expect(DEFAULT_CONFIG.smtp).toBe(1025)
    expect(DEFAULT_CONFIG.ip).toBe('::')
  })

  it('should have correct web server defaults', () => {
    expect(DEFAULT_CONFIG.web).toBe(1080)
    expect(DEFAULT_CONFIG.webIp).toBe('0.0.0.0')
    expect(DEFAULT_CONFIG.basePathname).toBe('/')
  })

  it('should have logging disabled by default', () => {
    expect(DEFAULT_CONFIG.verbose).toBe(false)
    expect(DEFAULT_CONFIG.silent).toBe(false)
    expect(DEFAULT_CONFIG.logMailContents).toBe(false)
  })

  it('should have MCP disabled by default', () => {
    expect(DEFAULT_CONFIG.mcp).toBe(false)
  })

  it('should not have optional properties set', () => {
    expect(DEFAULT_CONFIG.incomingUser).toBeUndefined()
    expect(DEFAULT_CONFIG.incomingPass).toBeUndefined()
    expect(DEFAULT_CONFIG.webUser).toBeUndefined()
    expect(DEFAULT_CONFIG.webPass).toBeUndefined()
    expect(DEFAULT_CONFIG.mailDirectory).toBeUndefined()
    expect(DEFAULT_CONFIG.outgoingHost).toBeUndefined()
  })
})

describe('getDefaultConfig', () => {
  it('should return a copy of default config', () => {
    const config = getDefaultConfig()
    expect(config).toEqual(DEFAULT_CONFIG)
    expect(config).not.toBe(DEFAULT_CONFIG)
  })

  it('should return independent copies', () => {
    const config1 = getDefaultConfig()
    const config2 = getDefaultConfig()

    config1.smtp = 9999
    expect(config2.smtp).toBe(1025)
    expect(DEFAULT_CONFIG.smtp).toBe(1025)
  })
})
