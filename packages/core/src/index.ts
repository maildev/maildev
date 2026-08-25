/**
 * @maildev/core
 *
 * Core types, utilities, and storage abstraction for MailDev.
 */

// 'development' is the dev-time placeholder. On build, scripts/set-version.mjs
// rewrites this constant in dist/index.js to match package.json's version, so
// released artifacts report the real version.
export const VERSION = 'development'

// Types
export type {
  Address,
  EnvelopeAddress,
  Attachment,
  Envelope,
  EmailPriority,
  Email,
  EmailInput,
  EmailSummary,
  StorageQuery,
  StorageOptions,
  Storage,
  StorageEvents,
  StorageStats,
  EvictHandler,
  SortOrder,
  ListOptions,
  ListResult,
} from './types/index.js'

// Storage implementations
export { MemoryStorage } from './storage/memory.js'
export { FileStorage } from './storage/file.js'

// Utilities
export { makeId } from './utils/id.js'
export { formatBytes } from './utils/format.js'
export { clone } from './utils/clone.js'
export { delay } from './utils/delay.js'
export { filterEmails, matchesSearchTerm } from './utils/filter.js'
export { toSummary } from './utils/summary.js'
export { mapLimit } from './utils/concurrency.js'

// Helpers
export { calculateBcc } from './helpers/bcc.js'
