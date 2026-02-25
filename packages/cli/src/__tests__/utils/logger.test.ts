import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger, createLogger } from '../../utils/logger.js'

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create logger with default options', () => {
      const logger = new Logger()
      logger.info('test')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('should respect verbose option', () => {
      const logger = new Logger({ verbose: true })
      logger.debug('test debug')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('should respect silent option', () => {
      const logger = new Logger({ silent: true })
      logger.info('test')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('configure', () => {
    it('should update verbose setting', () => {
      const logger = new Logger({ verbose: false })
      logger.debug('before')
      expect(consoleSpy.log).not.toHaveBeenCalled()

      logger.configure({ verbose: true })
      logger.debug('after')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('should update silent setting', () => {
      const logger = new Logger({ silent: false })
      logger.info('before')
      expect(consoleSpy.log).toHaveBeenCalledTimes(1)

      logger.configure({ silent: true })
      logger.info('after')
      expect(consoleSpy.log).toHaveBeenCalledTimes(1) // Still 1, not called again
    })
  })

  describe('debug', () => {
    it('should not log when not verbose', () => {
      const logger = new Logger({ verbose: false })
      logger.debug('test')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('should log when verbose', () => {
      const logger = new Logger({ verbose: true })
      logger.debug('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('should not log when silent (even if verbose)', () => {
      const logger = new Logger({ verbose: true, silent: true })
      logger.debug('test')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('info', () => {
    it('should log message', () => {
      const logger = new Logger()
      logger.info('test info')
      expect(consoleSpy.log).toHaveBeenCalledWith('test info')
    })

    it('should log with additional arguments', () => {
      const logger = new Logger()
      logger.info('test', { foo: 'bar' })
      expect(consoleSpy.log).toHaveBeenCalledWith('test', { foo: 'bar' })
    })

    it('should not log when silent', () => {
      const logger = new Logger({ silent: true })
      logger.info('test')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('success', () => {
    it('should log message', () => {
      const logger = new Logger()
      logger.success('operation completed')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('should not log when silent', () => {
      const logger = new Logger({ silent: true })
      logger.success('test')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('warn', () => {
    it('should log warning', () => {
      const logger = new Logger()
      logger.warn('test warning')
      expect(consoleSpy.warn).toHaveBeenCalled()
    })

    it('should not log when silent', () => {
      const logger = new Logger({ silent: true })
      logger.warn('test')
      expect(consoleSpy.warn).not.toHaveBeenCalled()
    })
  })

  describe('error', () => {
    it('should log error', () => {
      const logger = new Logger()
      logger.error('test error')
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('should not log when silent', () => {
      const logger = new Logger({ silent: true })
      logger.error('test')
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })
  })

  describe('banner', () => {
    it('should log multiple lines', () => {
      const logger = new Logger()
      logger.banner(['Line 1', 'Line 2', 'Line 3'])
      // 2 empty lines + 3 content lines = 5 calls
      expect(consoleSpy.log).toHaveBeenCalledTimes(5)
    })

    it('should not log when silent', () => {
      const logger = new Logger({ silent: true })
      logger.banner(['Line 1', 'Line 2'])
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('keyValue', () => {
    it('should log key-value pair', () => {
      const logger = new Logger()
      logger.keyValue('Port', '1025')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('should not log when silent', () => {
      const logger = new Logger({ silent: true })
      logger.keyValue('Port', '1025')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('email', () => {
    it('should log email information', () => {
      const logger = new Logger()
      logger.email('sender@test.com', 'recipient@test.com', 'Test Subject')
      expect(consoleSpy.log).toHaveBeenCalledTimes(2) // One for main line, one for subject
    })

    it('should not log when silent', () => {
      const logger = new Logger({ silent: true })
      logger.email('sender@test.com', 'recipient@test.com', 'Test Subject')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('emailContents', () => {
    it('should log JSON email contents', () => {
      const logger = new Logger()
      const email = { subject: 'Test', from: 'test@test.com' }
      logger.emailContents(email)
      expect(consoleSpy.log).toHaveBeenCalledTimes(2) // Label + JSON
    })

    it('should not log when silent', () => {
      const logger = new Logger({ silent: true })
      logger.emailContents({ subject: 'Test' })
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })
})

describe('createLogger', () => {
  it('should create a Logger instance', () => {
    const logger = createLogger()
    expect(logger).toBeInstanceOf(Logger)
  })

  it('should pass options to Logger', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const logger = createLogger({ verbose: true })
    logger.debug('test')
    expect(consoleSpy).toHaveBeenCalled()

    vi.restoreAllMocks()
  })
})
