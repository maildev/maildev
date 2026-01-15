import { describe, it, expect, vi } from 'vitest'
import { createLogger, defaultLogger, noopLogger } from '../logger.js'
import type { Logger } from '../types.js'

describe('createLogger', () => {
  it('should return noop logger when logger is false', () => {
    const logger = createLogger(false)

    expect(logger).toBe(noopLogger)
  })

  it('should return provided logger when passed', () => {
    const customLogger: Logger = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    const logger = createLogger(customLogger)

    expect(logger).toBe(customLogger)
  })

  it('should return default logger when undefined', () => {
    const logger = createLogger(undefined)

    expect(logger).toBe(defaultLogger)
  })
})

describe('noopLogger', () => {
  it('should not throw when called', () => {
    expect(() => noopLogger.log('test')).not.toThrow()
    expect(() => noopLogger.info('test')).not.toThrow()
    expect(() => noopLogger.warn('test')).not.toThrow()
    expect(() => noopLogger.error('test')).not.toThrow()
  })

  it('should return undefined from all methods', () => {
    expect(noopLogger.log('test')).toBeUndefined()
    expect(noopLogger.info('test')).toBeUndefined()
    expect(noopLogger.warn('test')).toBeUndefined()
    expect(noopLogger.error('test')).toBeUndefined()
  })
})

describe('defaultLogger', () => {
  it('should have all required methods', () => {
    expect(typeof defaultLogger.log).toBe('function')
    expect(typeof defaultLogger.info).toBe('function')
    expect(typeof defaultLogger.warn).toBe('function')
    expect(typeof defaultLogger.error).toBe('function')
  })

  it('should have optional debug method', () => {
    expect(typeof defaultLogger.debug).toBe('function')
  })
})
