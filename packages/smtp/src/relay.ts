/**
 * @maildev/smtp - Relay Client
 *
 * Async/await based email relay client for forwarding emails
 * to external SMTP servers.
 */

// @ts-expect-error - nodemailer types don't export SMTPConnection directly
import SMTPConnection from 'nodemailer/lib/smtp-connection'
// @ts-expect-error - wildstring has no type definitions
import wildstring from 'wildstring'
import type { Readable } from 'node:stream'
import type { Email, EnvelopeAddress as CoreEnvelopeAddress } from '@maildev/core'
import type {
  RelayConfig,
  AutoRelayConfig,
  RelayRule,
  RelayResult,
  Logger,
} from './types.js'
import { createLogger } from './logger.js'

// Configure wildstring for case-insensitive matching
wildstring.caseSensitive = false

/**
 * RelayClient handles forwarding emails to external SMTP servers
 */
export class RelayClient {
  private config: RelayConfig
  private autoRelayConfig?: AutoRelayConfig
  private logger: Logger
  private client: SMTPConnection | null = null

  constructor(config: RelayConfig, logger?: Logger | false) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || (config.secure ? 465 : 25),
      secure: config.secure || false,
      auth: config.auth,
    }
    this.logger = createLogger(logger)
  }

  /**
   * Configure auto-relay settings
   */
  setAutoRelay(config: AutoRelayConfig): void {
    this.autoRelayConfig = config

    if (config.enabled) {
      const messages = ['Auto-Relay mode enabled']
      if (config.defaultRecipient) {
        messages.push(`Relaying all emails to ${config.defaultRecipient}`)
      }
      if (config.rules) {
        messages.push(`Relay rules: ${JSON.stringify(config.rules)}`)
      }
      this.logger.info(messages.join(', '))
    }
  }

  /**
   * Check if auto-relay is enabled
   */
  isAutoRelayEnabled(): boolean {
    return this.autoRelayConfig?.enabled ?? false
  }

  /**
   * Get the outgoing host
   */
  getHost(): string {
    return this.config.host
  }

  /**
   * Relay an email to the configured SMTP server
   *
   * @param email - Email object to relay
   * @param emailStream - Readable stream of raw email content
   * @param isAutoRelay - Whether this is an auto-relay operation
   * @returns Relay result
   */
  async relay(
    email: Email,
    emailStream: Readable,
    isAutoRelay = false
  ): Promise<RelayResult> {
    let recipients = this.getRecipients(email)

    // Override recipients for auto-relay with default address
    if (isAutoRelay && this.autoRelayConfig?.defaultRecipient) {
      recipients = [this.autoRelayConfig.defaultRecipient]
    }

    // Filter recipients based on auto-relay rules
    if (isAutoRelay && this.autoRelayConfig?.rules) {
      recipients = this.filterByRules(recipients, this.autoRelayConfig.rules)
    }

    // Fail silently if no recipients
    if (recipients.length === 0) {
      return {
        success: false,
        message: 'Email had no recipients after filtering',
      }
    }

    const sender = this.getSender(email)

    try {
      await this.connect()

      if (this.config.auth) {
        await this.login()
      }

      await this.send(sender, recipients, emailStream)

      this.logger.log('Mail Delivered:', email.subject)

      return {
        success: true,
        message: `Relayed to ${recipients.join(', ')}`,
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error('Relay error:', err)
      return {
        success: false,
        error: err,
      }
    } finally {
      await this.disconnect()
    }
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    await this.disconnect()
  }

  /**
   * Connect to the SMTP server
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new SMTPConnection({
        port: this.config.port,
        host: this.config.host,
        secure: this.config.secure,
        tls: { rejectUnauthorized: false },
        debug: false,
      })

      this.client.on('error', (err: Error) => {
        this.logger.error('SMTP Connection error:', err)
      })

      this.client.connect((err: Error | null) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Login to the SMTP server
   */
  private async login(): Promise<void> {
    if (!this.client || !this.config.auth) {
      throw new Error('Cannot login: client not connected or no auth configured')
    }

    return new Promise((resolve, reject) => {
      this.client!.login(this.config.auth!, (err: Error | null) => {
        if (err) {
          this.logger.error('Outgoing client login error:', err)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Send the email
   */
  private async send(
    from: string,
    to: string[],
    stream: Readable
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Cannot send: client not connected')
    }

    return new Promise((resolve, reject) => {
      this.client!.send({ from, to }, stream, (err: Error | null) => {
        if (err) {
          this.logger.error('Mail Delivery Error:', err)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Disconnect from the SMTP server
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      try {
        this.client.quit()
      } catch {
        // Ignore quit errors
      }
      this.client = null
    }
  }

  /**
   * Extract recipients from email envelope
   */
  private getRecipients(email: Email): string[] {
    const envelopeTo = email.envelope?.to
    if (!envelopeTo || !Array.isArray(envelopeTo)) {
      return []
    }

    return envelopeTo.map((addr) => this.extractAddress(addr))
  }

  /**
   * Extract sender from email envelope
   */
  private getSender(email: Email): string {
    const from = email.envelope?.from
    if (!from) {
      return ''
    }
    return this.extractAddress(from)
  }

  /**
   * Extract address string from address object
   */
  private extractAddress(addr: CoreEnvelopeAddress | string): string {
    if (typeof addr === 'string') {
      return addr
    }
    return addr.address || ''
  }

  /**
   * Filter recipients based on relay rules
   */
  private filterByRules(recipients: string[], rules: RelayRule[]): string[] {
    return recipients.filter((email) => this.validateAgainstRules(email, rules))
  }

  /**
   * Validate an email address against relay rules
   */
  private validateAgainstRules(email: string, rules: RelayRule[]): boolean {
    // Default to allowing if no rules
    let result = true

    for (const rule of rules) {
      const pattern = rule.allow || rule.deny || ''
      const isMatch = wildstring.match(pattern, email)

      if (isMatch) {
        // Override previous result if this rule matches
        result = !!rule.allow
      }
    }

    return result
  }
}

/**
 * Create a RelayClient instance
 */
export function createRelayClient(
  config: RelayConfig,
  logger?: Logger | false
): RelayClient {
  return new RelayClient(config, logger)
}
