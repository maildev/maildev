/**
 * @maildev/smtp - Logger
 *
 * Simple logger with namespaced output.
 */

import type { Logger } from './types.js'

const PREFIX = '[maildev:smtp]'

/**
 * Default console logger
 */
export const defaultLogger: Logger = {
  log: (...args: unknown[]) => console.log(PREFIX, ...args),
  info: (...args: unknown[]) => console.info(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  debug: (...args: unknown[]) => console.debug(PREFIX, ...args),
}

/**
 * No-op logger for when logging is disabled
 */
export const noopLogger: Logger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}

/**
 * Create a logger based on configuration
 * @param logger - Logger instance, false to disable, or undefined for default
 */
export function createLogger(logger: Logger | false | undefined): Logger {
  if (logger === false) {
    return noopLogger
  }
  if (logger) {
    return logger
  }
  return defaultLogger
}
