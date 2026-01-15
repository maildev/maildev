/**
 * @maildev/smtp - SMTP Server
 *
 * Modern TypeScript SMTP server with async/await patterns.
 */

import { SMTPServer as SMTPServerLib } from 'smtp-server'
import type { SMTPServerSession, SMTPServerDataStream } from 'smtp-server'
import { EventEmitter } from 'node:events'
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, readFileSync } from 'node:fs'
import { rm, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { PassThrough, type Readable } from 'node:stream'
import { formatBytes, calculateBcc, makeId, type Storage, type Email, type Attachment } from '@maildev/core'
import { parseEmailStream, parseEmailBuffer } from './parser.js'
import { createAuthCallback } from './auth.js'
import { createLogger } from './logger.js'
import { sanitizeHtml, replaceCidReferences } from './sanitize.js'
import { transformAttachment, getAttachmentFilePath, getAttachmentDir } from './attachments.js'
import { RelayClient } from './relay.js'
import type {
  SMTPServerOptions,
  StoredEnvelope,
  ParsedEmail,
  ParsedAttachment,
  HideableExtension,
  RelayConfig,
  AutoRelayConfig,
  Logger,
  HTMLRenderOptions,
  EmailDownload,
  EnvelopeAddress,
  TransformedAttachment,
} from './types.js'

const DEFAULT_PORT = 1025
const DEFAULT_HOST = '::'

const HIDEABLE_EXTENSIONS: HideableExtension[] = [
  'STARTTLS',
  'PIPELINING',
  '8BITMIME',
  'SMTPUTF8',
]

/**
 * MailDev SMTP Server
 *
 * Receives emails via SMTP and stores them using the provided storage backend.
 */
export class SMTPServer extends EventEmitter {
  private smtp: SMTPServerLib | null = null
  private storage: Storage
  private mailDir: string
  private port: number
  private host: string
  private options: SMTPServerOptions
  private logger: Logger
  private relayClient: RelayClient | null = null

  constructor(options: SMTPServerOptions) {
    super()

    this.storage = options.storage
    this.mailDir = options.mailDir
    this.port = options.port || DEFAULT_PORT
    this.host = options.host || DEFAULT_HOST
    this.options = options
    this.logger = createLogger(options.logger)

    // Ensure mail directory exists
    this.ensureMailDir()
  }

  /**
   * Start the SMTP server
   */
  async start(): Promise<void> {
    // Build smtp-server configuration
    const config = this.buildServerConfig()

    this.smtp = new SMTPServerLib(config)

    // Handle server errors
    this.smtp.on('error', (err: NodeJS.ErrnoException) => {
      this.handleServerError(err)
    })

    // Start listening
    return new Promise((resolve, reject) => {
      this.smtp!.listen(this.port, this.host, (err?: Error) => {
        if (err) {
          reject(err)
          return
        }

        const printHost = this.host === '::' ? 'localhost' : this.host
        this.logger.info(`SMTP Server running at ${printHost}:${this.port}`)
        resolve()
      })
    })
  }

  /**
   * Stop the SMTP server
   */
  async stop(): Promise<void> {
    this.emit('close')

    if (this.relayClient) {
      await this.relayClient.close()
    }

    return new Promise((resolve) => {
      if (this.smtp) {
        this.smtp.close(() => resolve())
      } else {
        resolve()
      }
    })
  }

  /**
   * Configure outgoing relay
   */
  setupRelay(config: RelayConfig): void {
    this.relayClient = new RelayClient(config, this.options.logger)
    this.logger.info(
      `Outgoing SMTP configured: ${config.host}:${config.port} (secure: ${config.secure ? 'yes' : 'no'})`
    )
  }

  /**
   * Check if relay is enabled
   */
  isRelayEnabled(): boolean {
    return this.relayClient !== null
  }

  /**
   * Get the outgoing relay host
   */
  getRelayHost(): string | undefined {
    return this.relayClient?.getHost()
  }

  /**
   * Configure auto-relay
   */
  setAutoRelay(config: AutoRelayConfig): void {
    if (!this.relayClient) {
      this.logger.warn('Outgoing mail not configured - Auto relay mode ignored')
      return
    }
    this.relayClient.setAutoRelay(config)
  }

  /**
   * Check if auto-relay is enabled
   */
  isAutoRelayEnabled(): boolean {
    return this.relayClient?.isAutoRelayEnabled() ?? false
  }

  /**
   * Get an email by ID
   */
  async getEmail(id: string): Promise<Email> {
    const email = await this.storage.getById(id)
    if (!email) {
      throw new Error('Email was not found')
    }

    // Sanitize HTML content
    if (email.html) {
      const sanitized = sanitizeHtml(email.html)
      if (sanitized) {
        email.html = sanitized
      }
    }

    return email
  }

  /**
   * Get an email's HTML content with embedded attachments resolved
   */
  async getEmailHtml(id: string, options: HTMLRenderOptions = {}): Promise<string | undefined> {
    const email = await this.getEmail(id)

    if (!email.html) {
      return undefined
    }

    let html = email.html

    // Replace CID references with actual URLs
    if (email.attachments && email.attachments.length > 0) {
      html = replaceCidReferences(html, id, email.attachments, options.baseUrl)
    }

    return html
  }

  /**
   * Get a readable stream of the raw .eml file
   */
  async getRawEmail(id: string): Promise<Readable> {
    const email = await this.getEmail(id)
    return createReadStream(join(this.mailDir, `${email.id}.eml`))
  }

  /**
   * Get all emails
   */
  async getAllEmails(): Promise<Email[]> {
    return this.storage.getAll()
  }

  /**
   * Mark all emails as read
   */
  async markAllRead(): Promise<number> {
    const emails = await this.storage.getAll()
    let count = 0

    for (const email of emails) {
      if (!email.read) {
        email.read = true
        await this.storage.save(email)
        count++
      }
    }

    return count
  }

  /**
   * Delete an email by ID
   */
  async deleteEmail(id: string): Promise<boolean> {
    const email = await this.storage.getById(id)
    if (!email) {
      throw new Error('Email not found')
    }

    // Delete .eml file
    const emlPath = join(this.mailDir, `${id}.eml`)
    try {
      await rm(emlPath)
    } catch (err) {
      this.logger.error('Error deleting email file:', err)
    }

    // Delete attachments directory if exists
    const attachDir = getAttachmentDir(this.mailDir, id)
    try {
      await rm(attachDir, { recursive: true })
    } catch {
      // Directory may not exist
    }

    this.logger.warn('Deleting email -', email.subject)

    const result = await this.storage.delete(id)
    if (result) {
      this.emit('delete', { id })
    }

    return result
  }

  /**
   * Delete all emails
   */
  async deleteAllEmails(): Promise<number> {
    this.logger.warn('Deleting all emails')

    await this.clearMailDir()
    const count = await this.storage.deleteAll()

    this.emit('delete', { id: 'all' })

    return count
  }

  /**
   * Get an email attachment
   */
  async getEmailAttachment(
    id: string,
    filename: string
  ): Promise<{ contentType: string; stream: Readable }> {
    const email = await this.getEmail(id)

    if (!email.attachments || email.attachments.length === 0) {
      throw new Error('Email has no attachments')
    }

    const attachment = email.attachments.find(
      (a) => a.generatedFileName === filename
    )

    if (!attachment) {
      throw new Error('Attachment not found')
    }

    // Build the transformed attachment object for file path lookup
    const transformedAttachment: TransformedAttachment = {
      filename: attachment.filename,
      generatedFileName: attachment.generatedFileName,
      contentType: attachment.contentType,
      contentDisposition: attachment.contentDisposition,
      contentId: attachment.contentId,
      size: attachment.size || 0,
      transformed: true,
    }

    const filePath = getAttachmentFilePath(this.mailDir, id, transformedAttachment)
    const stream = createReadStream(filePath)

    return {
      contentType: attachment.contentType,
      stream,
    }
  }

  /**
   * Download an email as .eml file
   */
  async downloadEmail(id: string): Promise<EmailDownload> {
    await this.getEmail(id) // Verify email exists

    return {
      contentType: 'message/rfc822',
      filename: `${id}.eml`,
      stream: createReadStream(join(this.mailDir, `${id}.eml`)),
    }
  }

  /**
   * Relay an email to the configured outgoing server
   */
  async relayEmail(idOrEmail: string | Email, isAutoRelay = false): Promise<void> {
    if (!this.relayClient) {
      throw new Error('Outgoing mail not configured')
    }

    const email = typeof idOrEmail === 'string'
      ? await this.getEmail(idOrEmail)
      : idOrEmail

    const rawStream = await this.getRawEmail(email.id)
    const result = await this.relayClient.relay(email, rawStream, isAutoRelay)

    if (!result.success && result.error) {
      throw result.error
    }
  }

  /**
   * Load existing emails from the mail directory
   */
  async loadMailsFromDirectory(): Promise<void> {
    try {
      const files = await readdir(this.mailDir)

      for (const file of files) {
        if (!file.endsWith('.eml')) {
          continue
        }

        const filePath = join(this.mailDir, file)
        const id = file.slice(0, -4) // Remove .eml extension

        try {
          const data = await readFile(filePath, 'utf8')

          this.logger.log('Restoring email:', id)

          const parsed = await parseEmailBuffer(data)

          // Build envelope from parsed headers
          const envelope: StoredEnvelope = {
            from: parsed.from?.[0] ? { address: parsed.from[0].address } : false,
            to: (parsed.to || []).map((addr) => ({ address: addr.address })),
            host: 'restored',
            remoteAddress: 'restored',
          }

          await this.saveEmail(id, envelope, parsed, true)
        } catch (err) {
          this.logger.error(`Error restoring email ${id}:`, err)
        }
      }
    } catch (err) {
      this.logger.error('Error reading mail directory:', err)
    }
  }

  /**
   * Build smtp-server configuration
   */
  private buildServerConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {
      secure: this.options.secure || false,
      onData: this.handleDataStream.bind(this),
      logger: false,
      hideSTARTTLS: true,
      disabledCommands: ['AUTH'] as string[],
    }

    // Load TLS certificates
    if (this.options.certPath) {
      config.cert = readFileSync(this.options.certPath)
    }
    if (this.options.keyPath) {
      config.key = readFileSync(this.options.keyPath)
    }

    // Configure authentication
    if (this.options.auth) {
      config.onAuth = createAuthCallback(this.options.auth)
      config.disabledCommands = this.options.secure ? [] : ['STARTTLS']
    }

    // Hide extensions
    if (this.options.hideExtensions) {
      const hideOptions = this.getHideExtensionOptions(this.options.hideExtensions)
      Object.assign(config, hideOptions)
    }

    return config
  }

  /**
   * Get hide extension options for smtp-server
   */
  private getHideExtensionOptions(
    extensions: HideableExtension[]
  ): Record<string, boolean> {
    const options: Record<string, boolean> = {}

    for (const ext of extensions) {
      const upperExt = ext.toUpperCase() as HideableExtension
      if (!HIDEABLE_EXTENSIONS.includes(upperExt)) {
        throw new Error(`Invalid hideable extension: ${ext}`)
      }
      options[`hide${upperExt}`] = true
    }

    return options
  }

  /**
   * Handle incoming email data stream
   */
  private handleDataStream(
    stream: SMTPServerDataStream,
    session: SMTPServerSession,
    callback: (err: Error | null, message?: string) => void
  ): void {
    // Process asynchronously but call callback synchronously as required by smtp-server
    this.processIncomingEmail(stream, session)
      .then((id) => callback(null, `Message queued as ${id}`))
      .catch((err) => callback(err))
  }

  /**
   * Process an incoming email
   */
  private async processIncomingEmail(
    stream: Readable,
    session: SMTPServerSession
  ): Promise<string> {
    const id = makeId()
    const emlPath = join(this.mailDir, `${id}.eml`)

    // Create two pass-through streams to duplicate the data
    const emlPassThrough = new PassThrough()
    const parsePassThrough = new PassThrough()

    // Pipe to both streams
    stream.pipe(emlPassThrough)
    stream.pipe(parsePassThrough)

    // Write to disk and parse in parallel
    const [, parsed] = await Promise.all([
      pipeline(emlPassThrough, createWriteStream(emlPath)),
      parseEmailStream(parsePassThrough),
    ])

    // Save attachments
    if (parsed.attachments && parsed.attachments.length > 0) {
      await this.saveAttachments(id, parsed.attachments)
    }

    // Build envelope from session - convert smtp-server types to our types
    const sessionMailFrom = session.envelope.mailFrom
    const sessionRcptTo = session.envelope.rcptTo

    const envelope: StoredEnvelope = {
      from: sessionMailFrom
        ? { address: sessionMailFrom.address, args: sessionMailFrom.args as Record<string, string | boolean> | false }
        : false,
      to: (sessionRcptTo || []).map((addr) => ({
        address: addr.address,
        args: addr.args as Record<string, string | boolean> | false,
      })),
      host: session.hostNameAppearsAs,
      remoteAddress: session.remoteAddress,
    }

    // Save email to storage
    await this.saveEmail(id, envelope, parsed)

    return id
  }

  /**
   * Save an email to storage
   */
  private async saveEmail(
    id: string,
    envelope: StoredEnvelope,
    parsed: ParsedEmail,
    isRestored = false
  ): Promise<Email> {
    const emlPath = join(this.mailDir, `${id}.eml`)
    const stat = statSync(emlPath)

    // Transform attachments for storage
    const transformedAttachments: Attachment[] = parsed.attachments
      ? parsed.attachments.map((att) => {
          const transformed = transformAttachment(att)
          // Build attachment object, only including optional fields if they have values
          const attachment: Attachment = {
            filename: transformed.filename,
            generatedFileName: transformed.generatedFileName,
            contentType: transformed.contentType,
            contentDisposition: transformed.contentDisposition,
          }
          if (transformed.contentId) {
            attachment.contentId = transformed.contentId
          }
          if (transformed.size !== undefined) {
            attachment.size = transformed.size
          }
          return attachment
        })
      : []

    // Calculate BCC recipients - pass Address arrays as required
    const envelopeToAddresses: string[] = (envelope.to || []).map((t) => {
      if (typeof t === 'string') return t
      return t.address
    })

    const toAddresses = parsed.to || []
    const ccAddresses = parsed.cc || []

    const calculatedBcc = calculateBcc(
      envelopeToAddresses,
      toAddresses,
      ccAddresses
    )

    // Build email object, only including optional fields if they have values
    const email: Email = {
      id,
      time: parsed.date || new Date(),
      read: isRestored,
      subject: parsed.subject || '',
      source: emlPath,
      size: stat.size,
      sizeHuman: formatBytes(stat.size),
      from: parsed.from || [],
      to: parsed.to || [],
      headers: this.headersToRecord(parsed.headers),
      attachments: transformedAttachments,
      envelope: {
        from: this.toEnvelopeAddress(envelope.from),
        to: envelope.to.map((t) => this.toEnvelopeAddress(t)),
      },
      calculatedBcc,
    }

    // Add optional fields only if they have values
    if (parsed.cc && parsed.cc.length > 0) {
      email.cc = parsed.cc
    }
    if (parsed.html) {
      email.html = parsed.html
    }
    if (parsed.text) {
      email.text = parsed.text
    }
    if (parsed.inReplyTo) {
      email.inReplyTo = parsed.inReplyTo
    }
    if (parsed.priority) {
      email.priority = parsed.priority
    }

    await this.storage.save(email)

    this.logger.log('Saved email:', parsed.subject, 'id:', id)

    // Auto-relay if enabled
    if (!isRestored && this.isAutoRelayEnabled()) {
      try {
        await this.relayEmail(email, true)
      } catch (err) {
        this.logger.error('Error during auto-relay:', err)
      }
    }

    if (!isRestored) {
      this.emit('new', email)
    }

    return email
  }

  /**
   * Convert envelope address to core format
   */
  private toEnvelopeAddress(
    addr: EnvelopeAddress | { address: string; args?: boolean | Record<string, unknown> } | false
  ): { address: string; args?: boolean | Record<string, unknown> } {
    if (addr === false) {
      return { address: '' }
    }
    // Only include args if it's truthy (not false or undefined)
    const result: { address: string; args?: boolean | Record<string, unknown> } = {
      address: addr.address,
    }
    if (addr.args) {
      result.args = addr.args as boolean | Record<string, unknown>
    }
    return result
  }

  /**
   * Save email attachments to disk
   */
  private async saveAttachments(
    emailId: string,
    attachments: ParsedAttachment[]
  ): Promise<void> {
    const attachDir = getAttachmentDir(this.mailDir, emailId)

    if (!existsSync(attachDir)) {
      mkdirSync(attachDir, { recursive: true })
    }

    for (const attachment of attachments) {
      if (!attachment.content) {
        continue
      }

      const transformed = transformAttachment(attachment)
      const filePath = getAttachmentFilePath(this.mailDir, emailId, transformed)

      await writeFile(filePath, attachment.content)
    }
  }

  /**
   * Convert headers Map to plain object
   */
  private headersToRecord(
    headers?: Map<string, string | string[]>
  ): Record<string, string | string[]> {
    if (!headers) {
      return {}
    }

    const result: Record<string, string | string[]> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  /**
   * Handle SMTP server errors
   */
  private handleServerError(err: NodeJS.ErrnoException): void {
    // ECONNRESET is common when clients disconnect unexpectedly
    if (err.code === 'ECONNRESET' && err.syscall === 'read') {
      this.logger.warn(
        `Ignoring "${err.message}" error - client likely disconnected`
      )
      this.logger.debug?.(err)
    } else {
      this.emit('error', err)
      throw err
    }
  }

  /**
   * Ensure the mail directory exists
   */
  private ensureMailDir(): void {
    if (!existsSync(this.mailDir)) {
      mkdirSync(this.mailDir, { recursive: true })
    }
    this.logger.info('Using mail directory:', this.mailDir)
  }

  /**
   * Clear all files in the mail directory
   */
  private async clearMailDir(): Promise<void> {
    try {
      const files = await readdir(this.mailDir)

      await Promise.all(
        files.map((file) =>
          rm(join(this.mailDir, file), { recursive: true }).catch((err) => {
            this.logger.error('Error deleting file:', file, err)
          })
        )
      )
    } catch (err) {
      this.logger.error('Error clearing mail directory:', err)
    }
  }
}

/**
 * Create an SMTP server instance
 */
export function createSMTPServer(options: SMTPServerOptions): SMTPServer {
  return new SMTPServer(options)
}
