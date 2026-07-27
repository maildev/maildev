/**
 * MailDev CLI Default Configuration
 *
 * Default values matching v2 behavior for backward compatibility
 */

import type { MailDevConfig } from './types.js'

/**
 * Default configuration values
 * These match the v2 defaults exactly
 */
export const DEFAULT_CONFIG: MailDevConfig = {
  // SMTP Server
  smtp: 1025,
  ip: '::',

  // Web/API Server
  web: 1080,
  webIp: '0.0.0.0',
  basePathname: '/',

  // Storage. Bounded by default: an unbounded inbox eventually exhausts memory
  // and fills the mail directory, and 1000 messages is far more than a
  // development mail catcher needs. Use --max-emails 0 to keep everything.
  maxEmails: 1000,

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
