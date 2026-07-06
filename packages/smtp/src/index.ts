/**
 * @maildev/smtp
 *
 * SMTP server for MailDev with async/await patterns.
 */

// The value below is a dev-time fallback. On build, scripts/set-version.mjs
// rewrites this constant in dist/index.js to match package.json's version.
export const VERSION = '3.0.0-rc.1'

// Main server
export { SMTPServer, createSMTPServer } from './server.js'

// Relay client
export { RelayClient, createRelayClient } from './relay.js'

// Email parser
export { parseEmailFile, parseEmailStream, parseEmailBuffer } from './parser.js'

// Authentication
export { createAuthCallback, createNoAuthCallback } from './auth.js'

// HTML utilities
export { sanitizeHtml, replaceCidReferences } from './sanitize.js'

// Attachment utilities
export {
  transformAttachment,
  getAttachmentFilePath,
  getAttachmentDir,
  generateSecureFilename,
} from './attachments.js'

// Logger
export { createLogger, defaultLogger, noopLogger } from './logger.js'

// Types
export type {
  SMTPServerOptions,
  SMTPAuth,
  HideableExtension,
  AutoRelayConfig,
  RelayConfig,
  RelayRule,
  RelayResult,
  RelayTask,
  SMTPSession,
  EnvelopeAddress,
  StoredEnvelope,
  ParsedEmail,
  ParsedAttachment,
  TransformedAttachment,
  Logger,
  SMTPServerEvents,
  HTMLRenderOptions,
  EmailDownload,
} from './types.js'
