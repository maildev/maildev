/**
 * Email address object
 */
export interface Address {
  /** Email address (e.g., "user@example.com") */
  address: string
  /** Display name (e.g., "John Doe") */
  name?: string
}

/**
 * SMTP envelope address with optional protocol arguments
 */
export interface EnvelopeAddress extends Address {
  /** SMTP protocol arguments */
  args?: boolean | Record<string, unknown>
}

/**
 * Email attachment metadata
 */
export interface Attachment {
  /** Original filename from the email */
  filename: string
  /** Generated filename (MD5 hash for security) */
  generatedFileName: string
  /** MIME content type (e.g., "image/png") */
  contentType: string
  /** Content-ID for inline attachments (CID) */
  contentId?: string
  /** Disposition: inline (embedded) or attachment (downloadable) */
  contentDisposition: 'inline' | 'attachment'
  /** File size in bytes */
  size?: number
  /** Whether the attachment has been processed */
  transferred?: boolean
}

/**
 * SMTP envelope metadata (protocol-level information)
 */
export interface Envelope {
  /** SMTP MAIL FROM address */
  from: EnvelopeAddress
  /** SMTP RCPT TO addresses */
  to: EnvelopeAddress[]
  /** Hostname the email came from */
  host?: string
  /** Remote IP address of the sender */
  remoteAddress?: string
}

/**
 * Email priority level
 */
export type EmailPriority = 'normal' | 'high' | 'low'

/**
 * Complete email object as stored in MailDev
 */
export interface Email {
  /** Unique identifier (8-character alphanumeric) */
  id: string
  /** Timestamp when the email was received */
  time: Date
  /** Whether the email has been read */
  read: boolean
  /** Email subject line */
  subject: string
  /** Path to the .eml file on disk */
  source: string
  /** Size of the email in bytes */
  size: number
  /** Human-readable size (e.g., "2.5 KB") */
  sizeHuman: string

  /** Parsed From header addresses */
  from: Address[]
  /** Parsed To header addresses */
  to: Address[]
  /** Parsed CC header addresses */
  cc?: Address[]
  /** Parsed BCC header addresses (rarely present in headers) */
  bcc?: Address[]
  /** Calculated BCC addresses (derived from envelope vs headers) */
  calculatedBcc?: Address[]

  /** Date header from the email */
  date?: Date
  /** HTML body content (sanitized) */
  html?: string
  /** Plain text body content */
  text?: string
  /** Raw email headers */
  headers: Record<string, string | string[]>
  /** Message-ID this email is replying to */
  inReplyTo?: string
  /** Email priority */
  priority?: EmailPriority
  /** Attachment metadata */
  attachments: Attachment[]
  /** SMTP envelope data */
  envelope: Envelope
}

/**
 * Input for creating a new email (some fields are auto-generated)
 */
export interface EmailInput {
  /** Email subject line */
  subject: string
  /** Parsed From header addresses */
  from: Address[]
  /** Parsed To header addresses */
  to: Address[]
  /** Parsed CC header addresses */
  cc?: Address[]
  /** Date header from the email */
  date?: Date
  /** HTML body content */
  html?: string
  /** Plain text body content */
  text?: string
  /** Raw email headers */
  headers?: Record<string, string | string[]>
  /** Message-ID this email is replying to */
  inReplyTo?: string
  /** Email priority */
  priority?: EmailPriority
  /** Attachment metadata */
  attachments?: Attachment[]
  /** SMTP envelope data */
  envelope: Envelope
}
