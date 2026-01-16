/**
 * @maildev/api - Fastify API Server
 *
 * REST API and WebSocket server for MailDev.
 */

import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import { EventEmitter } from 'node:events'
import { Server as SocketServer } from 'socket.io'
import type { Storage, Email } from '@maildev/core'
import type { SMTPServer } from '@maildev/smtp'
import type { APIServerOptions, AuthConfig, ConfigResponse } from './types.js'
import { VERSION } from './index.js'

const DEFAULT_PORT = 1080
const DEFAULT_HOST = '0.0.0.0'

/**
 * MailDev API Server
 *
 * Provides REST API and WebSocket endpoints for the MailDev UI.
 */
export class APIServer extends EventEmitter {
  private app: FastifyInstance
  private storage: Storage
  private smtp: SMTPServer | undefined
  private io: SocketServer | null = null
  private options: APIServerOptions

  constructor(options: APIServerOptions) {
    super()

    this.storage = options.storage
    this.smtp = options.smtp
    this.options = options

    // Create Fastify instance
    this.app = Fastify({
      logger: options.logger ?? false,
    })
  }

  /**
   * Start the API server
   */
  async start(): Promise<void> {
    // Register CORS
    await this.app.register(cors, {
      origin: this.options.cors?.origin ?? true,
      credentials: this.options.cors?.credentials ?? true,
    })

    // Register authentication if configured
    if (this.options.auth && this.options.auth.type === 'basic') {
      this.registerAuthHook(this.options.auth)
    }

    // Register routes
    this.registerRoutes()

    // Setup WebSocket (Socket.io)
    this.setupWebSocket()

    // Start listening
    const port = this.options.port ?? DEFAULT_PORT
    const host = this.options.host ?? DEFAULT_HOST

    await this.app.listen({ port, host })

    const printHost = host === '0.0.0.0' ? 'localhost' : host
    console.info(`MailDev API running at http://${printHost}:${port}${this.options.basePath ?? ''}`)

    this.emit('listening', { port, host })
  }

  /**
   * Stop the API server
   */
  async stop(): Promise<void> {
    this.emit('close')

    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => resolve())
      })
    }

    await this.app.close()
  }

  /**
   * Get the underlying Fastify instance (for testing)
   */
  get server(): FastifyInstance {
    return this.app
  }

  /**
   * Register HTTP Basic Auth hook
   */
  private registerAuthHook(auth: AuthConfig): void {
    this.app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip auth for health check
      if (request.url === '/healthz') {
        return
      }

      const authorization = request.headers.authorization

      if (!authorization) {
        reply.header('WWW-Authenticate', 'Basic realm="MailDev"')
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const [type, credentials] = authorization.split(' ')

      if (type !== 'Basic' || !credentials) {
        reply.header('WWW-Authenticate', 'Basic realm="MailDev"')
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const decoded = Buffer.from(credentials, 'base64').toString()
      const [username, password] = decoded.split(':')

      if (username !== auth.user || password !== auth.pass) {
        reply.header('WWW-Authenticate', 'Basic realm="MailDev"')
        return reply.status(401).send({ error: 'Invalid username or password' })
      }
    })
  }

  /**
   * Register all routes
   */
  private registerRoutes(): void {
    const basePath = this.options.basePath ?? ''

    // Health check (always available, even without auth)
    this.app.get(`${basePath}/healthz`, async () => true)

    // Config endpoint
    this.app.get(`${basePath}/config`, async (): Promise<ConfigResponse> => {
      return {
        version: VERSION,
        smtpPort: this.smtp ? 1025 : undefined, // TODO: Get actual port from SMTP server
        isOutgoingEnabled: this.smtp?.isRelayEnabled() ?? false,
        outgoingHost: this.smtp?.getRelayHost() ?? null,
      }
    })

    // Get all emails
    this.app.get(`${basePath}/email`, async (request: FastifyRequest) => {
      const query = request.query as Record<string, string>
      const { skip, ...filterQuery } = query
      const skipCount = skip ? parseInt(skip, 10) : 0

      const emails = await this.storage.getAll()

      // Apply filtering if query params provided
      let result = emails
      if (Object.keys(filterQuery).length > 0) {
        result = this.filterEmails(emails, filterQuery)
      }

      // Apply pagination
      return result.slice(skipCount)
    })

    // Get single email
    this.app.get<{ Params: { id: string } }>(
      `${basePath}/email/:id`,
      async (request, reply) => {
        const { id } = request.params

        const email = await this.storage.getById(id)
        if (!email) {
          return reply.status(404).send({ error: 'Email was not found' })
        }

        // Mark as read
        if (!email.read) {
          email.read = true
          await this.storage.save(email)
        }

        return email
      }
    )

    // Delete single email
    this.app.delete<{ Params: { id: string } }>(
      `${basePath}/email/:id`,
      async (request, reply) => {
        const { id } = request.params

        try {
          if (this.smtp) {
            await this.smtp.deleteEmail(id)
          } else {
            const deleted = await this.storage.delete(id)
            if (!deleted) {
              return reply.status(404).send({ error: 'Email was not found' })
            }
          }
          return true
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return reply.status(500).send({ error: message })
        }
      }
    )

    // Delete all emails
    this.app.delete(`${basePath}/email/all`, async (_request, reply) => {
      try {
        if (this.smtp) {
          await this.smtp.deleteAllEmails()
        } else {
          await this.storage.deleteAll()
        }
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    })

    // Mark all emails as read
    this.app.patch(`${basePath}/email/read-all`, async (_request, reply) => {
      try {
        if (this.smtp) {
          const count = await this.smtp.markAllRead()
          return count
        } else {
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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    })

    // Get email HTML with embedded attachments
    this.app.get<{ Params: { id: string } }>(
      `${basePath}/email/:id/html`,
      async (request, reply) => {
        const { id } = request.params
        const baseUrl = request.headers.host ?? ''

        try {
          if (this.smtp) {
            const html = await this.smtp.getEmailHtml(id, { baseUrl })
            if (!html) {
              return reply.status(404).send({ error: 'Email has no HTML content' })
            }
            reply.type('text/html')
            return html
          } else {
            // Fallback for storage-only mode
            const email = await this.storage.getById(id)
            if (!email) {
              return reply.status(404).send({ error: 'Email was not found' })
            }
            if (!email.html) {
              return reply.status(404).send({ error: 'Email has no HTML content' })
            }
            reply.type('text/html')
            return email.html
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return reply.status(404).send({ error: message })
        }
      }
    )

    // Get raw email source
    this.app.get<{ Params: { id: string } }>(
      `${basePath}/email/:id/source`,
      async (request, reply) => {
        const { id } = request.params

        try {
          if (this.smtp) {
            const stream = await this.smtp.getRawEmail(id)
            return reply.send(stream)
          } else {
            return reply.status(404).send({ error: 'Email source not available' })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return reply.status(404).send({ error: message })
        }
      }
    )

    // Download email as .eml
    this.app.get<{ Params: { id: string } }>(
      `${basePath}/email/:id/download`,
      async (request, reply) => {
        const { id } = request.params

        try {
          if (this.smtp) {
            const download = await this.smtp.downloadEmail(id)
            reply.header('Content-Disposition', `attachment; filename=${download.filename}`)
            reply.type(download.contentType)
            return reply.send(download.stream)
          } else {
            return reply.status(404).send({ error: 'Email download not available' })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return reply.status(404).send({ error: message })
        }
      }
    )

    // Get attachment
    this.app.get<{ Params: { id: string; filename: string } }>(
      `${basePath}/email/:id/attachment/:filename`,
      async (request, reply) => {
        const { id, filename } = request.params

        try {
          if (this.smtp) {
            const { contentType, stream } = await this.smtp.getEmailAttachment(id, filename)
            reply.type(contentType)
            return reply.send(stream)
          } else {
            return reply.status(404).send({ error: 'Attachment not available' })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return reply.status(404).send({ error: message })
        }
      }
    )

    // Relay email
    this.app.post<{ Params: { id: string; relayTo?: string } }>(
      `${basePath}/email/:id/relay/:relayTo?`,
      async (request, reply) => {
        const { id, relayTo } = request.params

        try {
          if (!this.smtp) {
            return reply.status(500).send({ error: 'SMTP server not configured' })
          }

          if (!this.smtp.isRelayEnabled()) {
            return reply.status(500).send({ error: 'Outgoing mail not configured' })
          }

          // Get the email
          const email = await this.smtp.getEmail(id)

          // Override recipient if specified
          if (relayTo) {
            const emailRegexp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            if (!emailRegexp.test(relayTo)) {
              return reply.status(400).send({ error: `Incorrect email address provided: ${relayTo}` })
            }
            email.to = [{ address: relayTo }]
            email.envelope.to = [{ address: relayTo, args: false }]
          }

          await this.smtp.relayEmail(email)
          return true
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return reply.status(500).send({ error: message })
        }
      }
    )

    // Reload emails from directory
    this.app.get(`${basePath}/reloadMailsFromDirectory`, async (_request, reply) => {
      try {
        if (this.smtp) {
          await this.smtp.loadMailsFromDirectory()
        }
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    })
  }

  /**
   * Setup WebSocket (Socket.io) for real-time updates
   */
  private setupWebSocket(): void {
    if (!this.smtp) {
      return // WebSocket requires SMTP server for events
    }

    const basePath = this.options.basePath ?? ''

    // Create Socket.io server attached to the underlying HTTP server
    this.io = new SocketServer(this.app.server, {
      path: `${basePath}/socket.io`,
      cors: {
        origin: this.options.cors?.origin ?? '*',
        credentials: this.options.cors?.credentials ?? true,
      },
    })

    this.io.on('connection', (socket) => {
      const newHandler = (email: Email) => {
        socket.emit('newMail', email)
      }

      const deleteHandler = (data: { id: string; index?: number }) => {
        socket.emit('deleteMail', data)
      }

      this.smtp!.on('new', newHandler)
      this.smtp!.on('delete', deleteHandler)

      socket.on('disconnect', () => {
        this.smtp!.off('new', newHandler)
        this.smtp!.off('delete', deleteHandler)
      })
    })
  }

  /**
   * Filter emails by query parameters (supports dot notation)
   */
  private filterEmails(emails: Email[], query: Record<string, string>): Email[] {
    return emails.filter((email) => {
      for (const [key, value] of Object.entries(query)) {
        const emailValue = this.getNestedValue(email as unknown as Record<string, unknown>, key)

        if (emailValue === undefined) {
          return false
        }

        // Handle array values (e.g., from.address where from is an array)
        if (Array.isArray(emailValue)) {
          if (!emailValue.some((v) => String(v) === value)) {
            return false
          }
        } else if (String(emailValue) !== value) {
          return false
        }
      }
      return true
    })
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.')
    let current: unknown = obj

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }

      if (Array.isArray(current)) {
        // If current is an array, map to get the property from each item
        return current.map((item) => {
          if (typeof item === 'object' && item !== null) {
            return (item as Record<string, unknown>)[part]
          }
          return undefined
        })
      }

      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return current
  }
}

/**
 * Create an API server instance
 */
export function createAPIServer(options: APIServerOptions): APIServer {
  return new APIServer(options)
}
