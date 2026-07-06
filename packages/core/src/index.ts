/**
 * @maildev/core
 *
 * Core types, utilities, and storage abstraction for MailDev.
 */

// The value below is a dev-time fallback. On build, scripts/set-version.mjs
// rewrites this constant in dist/index.js to match package.json's version.
export const VERSION = '3.0.0-rc.1'

// Types
export type {
  Address,
  EnvelopeAddress,
  Attachment,
  Envelope,
  EmailPriority,
  Email,
  EmailInput,
  StorageQuery,
  StorageOptions,
  Storage,
  StorageEvents,
} from './types/index.js'

// Storage implementations
export { MemoryStorage } from './storage/memory.js'
export { FileStorage } from './storage/file.js'

// Utilities
export { makeId } from './utils/id.js'
export { formatBytes } from './utils/format.js'
export { clone } from './utils/clone.js'
export { delay } from './utils/delay.js'
export { filterEmails } from './utils/filter.js'

// Helpers
export { calculateBcc } from './helpers/bcc.js'
