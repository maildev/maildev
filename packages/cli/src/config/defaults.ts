/**
 * MailDev CLI Default Configuration
 *
 * Default values matching v2 behavior for backward compatibility
 */

import type { MailDevConfig } from './types.js'

/**
 * Default maximum accepted message size (50 MB). Bounds the work done parsing a
 * single message so a maliciously large multipart body can't tie up the server.
 */
export const DEFAULT_MAX_MESSAGE_SIZE = 50 * 1024 * 1024

/**
 * Default configuration values
 * These match the v2 defaults exactly
 */
export const DEFAULT_CONFIG: MailDevConfig = {
  // SMTP Server
  smtp: 1025,
  ip: '::',
  maxMessageSize: DEFAULT_MAX_MESSAGE_SIZE,

  // Web/API Server
  web: 1080,
  webIp: '0.0.0.0',
  basePathname: '/',

  // Logging (all off by default)
  verbose: false,
  silent: false,
  logMailContents: false,

  // v3 features (off by default for compatibility)
  mcp: false,
}

/**
 * Get a copy of the default configuration
 */
export function getDefaultConfig(): MailDevConfig {
  return { ...DEFAULT_CONFIG }
}
