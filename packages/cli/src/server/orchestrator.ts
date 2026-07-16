/**
 * MailDev Server Orchestrator
 *
 * Main class that manages all MailDev servers (Storage, SMTP, API)
 */

import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'
import { MemoryStorage, FileStorage, type Storage } from '@maildev/core'
import { createSMTPServer, type SMTPServer, type RelayConfig, type AutoRelayConfig, type RelayRule } from '@maildev/smtp'
import { createAPIServer, type APIServer } from '@maildev/api'
import { registerUI } from '@maildev/ui/server'
import type { MailDevConfig } from '../config/types.js'
import { Logger } from '../utils/logger.js'

/**
 * Server instances managed by orchestrator
 */
export interface Servers {
  storage: Storage
  smtp: SMTPServer
  api?: APIServer
}

/**
 * Orchestrator options
 */
export interface OrchestratorOptions {
  config: MailDevConfig
  logger: Logger
}

/**
 * Server Orchestrator
 *
 * Creates and manages Storage, SMTP, and API servers
 */
export class Orchestrator {
  private config: MailDevConfig
  private logger: Logger
  private storage: Storage | null = null
  private smtp: SMTPServer | null = null
  private api: APIServer | null = null
  private running = false

  constructor(options: OrchestratorOptions) {
    this.config = options.config
    this.logger = options.logger
  }

  /**
   * Start all servers
   */
  async start(): Promise<Servers> {
    if (this.running) {
      throw new Error('Servers are already running')
    }

    // 1. Create and initialize storage
    this.storage = await this.createStorage()
    await this.storage.initialize()
    this.logger.debug('Storage initialized')

    // 2. Create mail directory path
    const mailDir = this.config.mailDirectory || join(tmpdir(), 'maildev')

    // 3. Create SMTP server
    const smtpOptions: Parameters<typeof createSMTPServer>[0] = {
      port: this.config.smtp,
      host: this.config.ip,
      storage: this.storage,
      mailDir,
      logger: this.config.verbose ? this.createSmtpLogger() : false,
    }
    if (this.config.incomingSecure !== undefined) {
      smtpOptions.secure = this.config.incomingSecure
    }
    if (this.config.incomingCert) {
      smtpOptions.certPath = this.config.incomingCert
    }
    if (this.config.incomingKey) {
      smtpOptions.keyPath = this.config.incomingKey
    }
    const smtpAuth = this.getSmtpAuth()
    if (smtpAuth) {
      smtpOptions.auth = smtpAuth
    }
    if (this.config.hideExtensions) {
      smtpOptions.hideExtensions = this.config.hideExtensions
    }
    this.smtp = createSMTPServer(smtpOptions)

    // 4. Configure relay if outgoing host is set
    if (this.config.outgoingHost) {
      const relayConfig = this.getRelayConfig()
      this.smtp.setupRelay(relayConfig)
      this.logger.debug(`Relay configured to ${relayConfig.host}:${relayConfig.port}`)
    }

    // 5. Configure auto-relay if enabled
    if (this.config.autoRelay) {
      const autoRelayConfig = await this.getAutoRelayConfig()
      this.smtp.setAutoRelay(autoRelayConfig)
      this.logger.debug('Auto-relay enabled')
    }

    // 6. Start SMTP server
    await this.smtp.start()
    this.logger.debug(`SMTP server started on ${this.config.ip}:${this.config.smtp}`)

    // 7. Set up email event handlers
    this.setupEmailHandlers()

    // 8. Create and start API server (unless disabled)
    if (!this.config.disableWeb) {
      // Normalize basePath: '/' should become empty string, remove trailing slashes
      const basePath = this.config.basePathname === '/' ? '' : this.config.basePathname.replace(/\/$/, '')

      const apiOptions: Parameters<typeof createAPIServer>[0] = {
        port: this.config.web,
        host: this.config.webIp,
        basePath,
        storage: this.storage,
        smtp: this.smtp,
      }
      const webAuth = this.getWebAuth()
      if (webAuth) {
        apiOptions.auth = webAuth
      }
      if (this.config.verbose !== undefined) {
        apiOptions.logger = this.config.verbose
      }
      if (this.config.https) {
        apiOptions.https = this.config.https
        if (this.config.httpsCert) {
          apiOptions.httpsCert = this.config.httpsCert
        }
        if (this.config.httpsKey) {
          apiOptions.httpsKey = this.config.httpsKey
        }
      }
      if (this.config.mcp) {
        apiOptions.mcp = { enabled: true }
      }
      this.api = createAPIServer(apiOptions)

      // Write HTTPS status file for Docker health check
      try {
        writeFileSync('/tmp/maildev-https', this.config.https ? 'true' : 'false')
      } catch (error) {
        this.logger.debug(`Failed to write HTTPS status file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      await this.api.registerPlugins()
      await registerUI(this.api.server, { basePath })
      await this.api.listen()
      this.logger.debug(`API server started on ${this.config.webIp}:${this.config.web}`)
    }

    this.running = true

    const servers: Servers = {
      storage: this.storage,
      smtp: this.smtp,
    }
    if (this.api) {
      servers.api = this.api
    }
    return servers
  }

  /**
   * Stop all servers gracefully
   */
  async stop(): Promise<void> {
    if (!this.running) return

    this.logger.debug('Stopping servers...')

    // Stop in reverse order
    if (this.api) {
      await this.api.stop()
      this.logger.debug('API server stopped')
    }

    if (this.smtp) {
      await this.smtp.stop()
      this.logger.debug('SMTP server stopped')
    }

    if (this.storage) {
      await this.storage.close()
      this.logger.debug('Storage closed')
    }

    this.running = false
    this.api = null
    this.smtp = null
    this.storage = null
  }

  /**
   * Check if servers are running
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Get server instances
   */
  getServers(): Servers | null {
    if (!this.running || !this.storage || !this.smtp) {
      return null
    }
    const servers: Servers = {
      storage: this.storage,
      smtp: this.smtp,
    }
    if (this.api) {
      servers.api = this.api
    }
    return servers
  }

  /**
   * Create storage instance based on config
   */
  private async createStorage(): Promise<Storage> {
    if (this.config.mailDirectory) {
      this.logger.debug(`Using file storage: ${this.config.mailDirectory}`)
      return new FileStorage({
        mailDirectory: this.config.mailDirectory,
      })
    }
    this.logger.debug('Using in-memory storage')
    return new MemoryStorage()
  }

  /**
   * Get SMTP authentication config
   */
  private getSmtpAuth(): { user: string; pass: string } | undefined {
    if (this.config.incomingUser && this.config.incomingPass) {
      return {
        user: this.config.incomingUser,
        pass: this.config.incomingPass,
      }
    }
    return undefined
  }

  /**
   * Get web authentication config
   */
  private getWebAuth(): { type: 'basic' | 'none'; user?: string; pass?: string } | undefined {
    if (this.config.webUser && this.config.webPass) {
      return {
        type: 'basic',
        user: this.config.webUser,
        pass: this.config.webPass,
      }
    }
    return undefined
  }

  /**
   * Get relay configuration
   */
  private getRelayConfig(): RelayConfig {
    const config: RelayConfig = {
      host: this.config.outgoingHost!,
      port: this.config.outgoingPort || 25,
    }
    if (this.config.outgoingSecure !== undefined) {
      config.secure = this.config.outgoingSecure
    }
    if (this.config.outgoingUser && this.config.outgoingPass) {
      config.auth = {
        user: this.config.outgoingUser,
        pass: this.config.outgoingPass,
      }
    }
    return config
  }

  /**
   * Get auto-relay configuration
   */
  private async getAutoRelayConfig(): Promise<AutoRelayConfig> {
    const config: AutoRelayConfig = {
      enabled: true,
    }

    // If auto-relay is a string, it's the default recipient
    if (typeof this.config.autoRelay === 'string') {
      config.defaultRecipient = this.config.autoRelay
    }

    // Load rules file if specified
    if (this.config.autoRelayRules) {
      try {
        const rulesContent = await readFile(this.config.autoRelayRules, 'utf-8')
        config.rules = JSON.parse(rulesContent) as RelayRule[]
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to load auto-relay rules: ${message}`)
      }
    }

    return config
  }

  /**
   * Create SMTP logger adapter
   */
  private createSmtpLogger() {
    return {
      log: (...args: unknown[]) => this.logger.debug(String(args[0]), ...args.slice(1)),
      info: (...args: unknown[]) => this.logger.info(String(args[0]), ...args.slice(1)),
      warn: (...args: unknown[]) => this.logger.warn(String(args[0]), ...args.slice(1)),
      error: (...args: unknown[]) => this.logger.error(String(args[0]), ...args.slice(1)),
      debug: (...args: unknown[]) => this.logger.debug(String(args[0]), ...args.slice(1)),
    }
  }

  /**
   * Set up email event handlers
   */
  private setupEmailHandlers(): void {
    if (!this.smtp) return

    this.smtp.on('new', (email) => {
      const from = email.from?.[0]?.address || 'unknown'
      const to = email.to?.[0]?.address || 'unknown'
      this.logger.email(from, to, email.subject || '(no subject)')

      if (this.config.logMailContents) {
        this.logger.emailContents(email)
      }
    })

    this.smtp.on('error', (error) => {
      this.logger.error(`SMTP error: ${error.message}`)
    })
  }
}

/**
 * Create a new orchestrator instance
 */
export function createOrchestrator(options: OrchestratorOptions): Orchestrator {
  return new Orchestrator(options)
}
