/**
 * @maildev/smtp - Type definitions
 */

import type { Storage, Address, Email, EnvelopeAddress as CoreEnvelopeAddress } from '@maildev/core'

// Re-export core types that we use
export type { Email, Address }

/**
 * SMTP Server configuration options
 */
export interface SMTPServerOptions {
  /** Port to listen on (default: 1025) */
  port?: number
  /** Host to bind to (default: '::') */
  host?: string
  /** Storage backend for emails */
  storage: Storage
  /** Directory for storing .eml files and attachments */
  mailDir: string
  /** Enable TLS/SSL */
  secure?: boolean
  /** Path to TLS certificate file */
  certPath?: string
  /** Path to TLS key file */
  keyPath?: string
  /** SMTP authentication credentials */
  auth?: SMTPAuth
  /** SMTP extensions to hide */
  hideExtensions?: HideableExtension[]
  /** Auto-relay configuration */
  autoRelay?: AutoRelayConfig
  /** Logger instance or false to disable */
  logger?: Logger | false
}

/**
 * SMTP authentication credentials
 */
export interface SMTPAuth {
  user: string
  pass: string
}

/**
 * SMTP extensions that can be hidden
 */
export type HideableExtension = 'STARTTLS' | 'PIPELINING' | '8BITMIME' | 'SMTPUTF8'

/**
 * Auto-relay configuration
 */
export interface AutoRelayConfig {
  /** Enable auto-relay */
  enabled: boolean
  /** Rules for filtering which emails to relay */
  rules?: RelayRule[]
  /** Override all recipients with this address */
  defaultRecipient?: string
}

/**
 * Relay rule for filtering emails
 */
export interface RelayRule {
  /** Pattern to match (supports wildcards) */
  allow?: string
  /** Pattern to deny (supports wildcards) */
  deny?: string
}

/**
 * Outgoing relay server configuration
 */
export interface RelayConfig {
  /** SMTP host */
  host: string
  /** SMTP port */
  port: number
  /** Enable TLS/SSL */
  secure?: boolean
  /** Authentication credentials */
  auth?: SMTPAuth | undefined
}

/**
 * SMTP session information from smtp-server
 */
export interface SMTPSession {
  id: string
  envelope: {
    mailFrom: EnvelopeAddress | false
    rcptTo: EnvelopeAddress[]
  }
  hostNameAppearsAs?: string
  remoteAddress?: string
}

/**
 * Envelope address from SMTP session
 */
export interface EnvelopeAddress {
  address: string
  args?: Record<string, string | boolean> | false
  name?: string
}

/**
 * Internal envelope structure for storing with email
 */
export interface StoredEnvelope {
  from: EnvelopeAddress | CoreEnvelopeAddress | false
  to: Array<EnvelopeAddress | CoreEnvelopeAddress>
  host?: string | undefined
  remoteAddress?: string | undefined
}

/**
 * Parsed email structure from mailparser
 */
export interface ParsedEmail {
  subject?: string | undefined
  from?: Address[] | undefined
  to?: Address[] | undefined
  cc?: Address[] | undefined
  bcc?: Address[] | undefined
  date?: Date | undefined
  html?: string | undefined
  text?: string | undefined
  headers?: Map<string, string | string[]> | undefined
  messageId?: string | undefined
  inReplyTo?: string | undefined
  priority?: 'high' | 'normal' | 'low' | undefined
  attachments?: ParsedAttachment[] | undefined
}

/**
 * Attachment from mailparser
 */
export interface ParsedAttachment {
  filename?: string | undefined
  contentType: string
  contentDisposition?: string | undefined
  contentId?: string | undefined
  size: number
  content?: Buffer | undefined
  checksum?: string | undefined
  headers?: Map<string, string> | undefined
}

/**
 * Transformed attachment for storage
 */
export interface TransformedAttachment {
  filename: string
  generatedFileName: string
  contentType: string
  contentDisposition: 'inline' | 'attachment'
  contentId?: string | undefined
  size: number
  checksum?: string | undefined
  transformed: true
}

/**
 * Logger interface
 */
export interface Logger {
  log: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug?: (...args: unknown[]) => void
}

/**
 * SMTP Server events
 */
export interface SMTPServerEvents {
  /** Emitted when a new email is received */
  new: (email: Email) => void
  /** Emitted when an email is deleted */
  delete: (info: { id: string; index?: number }) => void
  /** Emitted when the server is closed */
  close: () => void
  /** Emitted on server errors */
  error: (error: Error) => void
}

/**
 * Relay task for queue processing
 */
export interface RelayTask {
  email: Email
  emailStream: NodeJS.ReadableStream
  isAutoRelay: boolean
}

/**
 * Relay result
 */
export interface RelayResult {
  success: boolean
  message?: string
  error?: Error
}

/**
 * HTML rendering options for email
 */
export interface HTMLRenderOptions {
  /** Base URL for attachment URLs */
  baseUrl?: string
}

/**
 * Email download response
 */
export interface EmailDownload {
  contentType: string
  filename: string
  stream: NodeJS.ReadableStream
}

/**
 * Address type for internal parsing
 */
export interface AddressValue {
  address?: string
  name?: string
}

/**
 * Address list from mailparser
 */
export interface AddressList {
  value: AddressValue[]
  html?: string
  text?: string
}
