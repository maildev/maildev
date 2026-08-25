/**
 * @maildev/api - Fastify API Server
 *
 * REST API and WebSocket server for MailDev.
 */

import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
  type FastifyRequest,
  type FastifyReply,
} from 'fastify'
import cors from '@fastify/cors'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { Server as SocketServer } from 'socket.io'
import { Server as MCPServer } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { registerMCPHandlers, type EmailDataSource } from '@maildev/mcp'
import { toSummary, type Storage, type Email, type SortOrder } from '@maildev/core'
import type { SMTPServer } from '@maildev/smtp'
import type {
  APIServerOptions,
  AuthConfig,
  BulkDeleteEmailsRequest,
  ConfigResponse,
  SummaryQuery,
  SummaryResponse,
} from './types.js'
import { VERSION } from './index.js'

const DEFAULT_PORT = 1080
const DEFAULT_HOST = '0.0.0.0'

/**
 * Upper bound on how many summaries a single request can ask for
 *
 * A client that asks for everything still gets a bounded response, so no single
 * request can pin the event loop serialising the whole inbox.
 */
const MAX_PAGE_SIZE = 200

/** Page size used when a request doesn't ask for one */
const DEFAULT_PAGE_SIZE = 50

/**
 * Parse a query-string integer, ignoring anything that isn't a positive number
 * @param value - Raw query parameter
 * @returns The parsed value, or undefined if absent or unusable
 */
function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined || value === '') {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

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
  private mcpTransports: Map<string, StreamableHTTPServerTransport> = new Map()
  private pluginsRegistered = false

  constructor(options: APIServerOptions) {
    super()

    this.storage = options.storage
    this.smtp = options.smtp
    this.options = options

    // Create Fastify instance, serving over HTTPS when configured. Typed as a
    // plain record because Fastify's overloaded call signature collapses
    // `Parameters<typeof Fastify>[0]` to `never`.
    const fastifyOptions: Record<string, unknown> = {
      logger: options.logger ?? false,
    }

    if (options.https) {
      if (!options.httpsCert || !options.httpsKey) {
        throw new Error('HTTPS is enabled but httpsCert and httpsKey were not provided')
      }
      try {
        fastifyOptions.https = {
          cert: readFileSync(options.httpsCert),
          key: readFileSync(options.httpsKey),
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Failed to read HTTPS certificate/key files: ${message}`)
      }
    }

    // Fastify's instance type differs for HTTPS; we hold it as the common
    // FastifyInstance either way.
    this.app = Fastify(fastifyOptions as unknown as FastifyServerOptions) as unknown as FastifyInstance
  }

  /**
   * Register all plugins and routes (without starting the server)
   */
  async registerPlugins(): Promise<void> {
    if (this.pluginsRegistered) return

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

    // Setup MCP server (if enabled)
    this.setupMCP()

    // Setup WebSocket (Socket.io)
    this.setupWebSocket()

    this.pluginsRegistered = true
  }

  /**
   * Start listening on the configured port
   */
  async listen(): Promise<void> {
    const port = this.options.port ?? DEFAULT_PORT
    const host = this.options.host ?? DEFAULT_HOST

    await this.app.listen({ port, host })

    const printHost = host === '0.0.0.0' ? 'localhost' : host
    const protocol = this.options.https ? 'https' : 'http'
    console.info(`MailDev API running at ${protocol}://${printHost}:${port}${this.options.basePath ?? ''}`)

    this.emit('listening', { port, host })
  }

  /**
   * Start the API server
   */
  async start(): Promise<void> {
    await this.registerPlugins()
    await this.listen()
  }

  /**
   * Stop the API server
   */
  async stop(): Promise<void> {
    this.emit('close')

    // Close any open MCP sessions (each closes its paired server too).
    for (const transport of this.mcpTransports.values()) {
      await transport.close()
    }
    this.mcpTransports.clear()

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
    const basePath = this.options.basePath ?? ''
    const healthPath = `${basePath}/api/healthz`

    this.app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip auth for health check (always available, even without auth)
      if (request.url.split('?')[0] === healthPath) {
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
    const apiPath = `${basePath}/api`

    // Health check (always available, even without auth)
    this.app.get(`${apiPath}/healthz`, async () => true)

    // Config endpoint
    this.app.get(`${apiPath}/config`, async (): Promise<ConfigResponse> => {
      return {
        version: VERSION,
        smtpPort: this.smtp ? 1025 : undefined, // TODO: Get actual port from SMTP server
        isOutgoingEnabled: this.smtp?.isRelayEnabled() ?? false,
        outgoingHost: this.smtp?.getRelayHost() ?? null,
      }
    })

    // Paginated summaries — what the web UI lists.
    //
    // Registered before /email/:id so the literal path wins, same as
    // /email/all and /email/read-all below.
    this.app.get(`${apiPath}/email/summary`, async (request): Promise<SummaryResponse> => {
      const query = request.query as SummaryQuery
      const skip = parsePositiveInt(query.skip) ?? 0
      const requested = parsePositiveInt(query.limit)
      // A missing or zero limit means "a page", not "everything" — storage
      // treats limit 0 as unbounded, which would defeat MAX_PAGE_SIZE.
      const limit =
        requested === undefined || requested === 0
          ? DEFAULT_PAGE_SIZE
          : Math.min(requested, MAX_PAGE_SIZE)
      const sort: SortOrder = query.sort === 'asc' ? 'asc' : 'desc'

      // Storage returns full emails; the body-free summary projection happens
      // here, at the API boundary, so a listing stays a few hundred bytes per
      // email rather than tens of kilobytes.
      const result = await this.storage.list({
        skip,
        limit,
        sort,
        ...(query.search ? { search: query.search } : {}),
        ...(query.unread === 'true' ? { unreadOnly: true } : {}),
      })

      return {
        items: result.items.map(toSummary),
        total: result.total,
        storeTotal: result.storeTotal,
        unread: result.unread,
        skip: result.skip,
        limit: result.limit,
      }
    })

    // Get all emails
    this.app.get(`${apiPath}/email`, async (request: FastifyRequest) => {
      const query = request.query as Record<string, string>
      const { skip, limit, sort, ...filterQuery } = query
      const skipCount = parsePositiveInt(skip) ?? 0
      const limitCount = parsePositiveInt(limit)

      const emails = await this.storage.getAll()

      // Apply filtering if query params provided
      let result = emails
      if (Object.keys(filterQuery).length > 0) {
        result = this.filterEmails(emails, filterQuery)
      }

      // Order by received time only when asked. Without `sort` the emails come
      // back in arrival order, which is what this endpoint has always done.
      if (sort === 'desc' || sort === 'asc') {
        const direction = sort === 'asc' ? 1 : -1
        result = result
          .map((email) => ({ email, time: new Date(email.time).getTime() }))
          .sort((a, b) => direction * (a.time - b.time))
          .map((entry) => entry.email)
      }

      // Apply pagination. No implicit limit here: this endpoint predates
      // /email/summary and callers rely on getting the whole inbox back.
      return limitCount === undefined
        ? result.slice(skipCount)
        : result.slice(skipCount, skipCount + limitCount)
    })

    // Get single email
    this.app.get<{ Params: { id: string } }>(
      `${apiPath}/email/:id`,
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
          // Let other tabs update their list and unread badge; the tab that
          // opened the email has already done so optimistically.
          this.io?.emit('readMail', { id })
        }

        return email
      }
    )

    // Delete single email
    this.app.delete<{ Params: { id: string } }>(`${apiPath}/email/:id`, async (request, reply) => {
      const { id } = request.params

      try {
        const deleted = await this.deleteEmail(id)
        if (!deleted) {
          return reply.status(404).send({ error: 'Email was not found' })
        }
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    })

    // Delete multiple emails
    this.app.post<{ Body: BulkDeleteEmailsRequest }>(
      `${apiPath}/email/delete`,
      async (request, reply) => {
        const ids = request.body?.ids

        if (
          !Array.isArray(ids) ||
          ids.some((id) => typeof id !== 'string' || id.trim().length === 0)
        ) {
          return reply
            .status(400)
            .send({ error: 'Request body must include an ids array of email IDs' })
        }

        const uniqueIds = Array.from(new Set(ids))
        const deleted: string[] = []
        const notFound: string[] = []

        try {
          for (const id of uniqueIds) {
            const wasDeleted = await this.deleteEmail(id)
            if (wasDeleted) {
              deleted.push(id)
            } else {
              notFound.push(id)
            }
          }

          return { deleted, notFound }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          return reply.status(500).send({ error: message })
        }
      }
    )

    // Delete all emails
    this.app.delete(`${apiPath}/email/all`, async (_request, reply) => {
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
    this.app.patch(`${apiPath}/email/read-all`, async (_request, reply) => {
      try {
        const count = this.smtp
          ? await this.smtp.markAllRead()
          : await this.storage.markAllRead()
        // Only tabs other than the one that triggered it need telling, and only
        // when something actually changed.
        if (count > 0) {
          this.io?.emit('readAllMail')
        }
        return count
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    })

    // Get email HTML with embedded attachments
    this.app.get<{ Params: { id: string } }>(
      `${apiPath}/email/:id/html`,
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
      `${apiPath}/email/:id/source`,
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
      `${apiPath}/email/:id/download`,
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
      `${apiPath}/email/:id/attachment/:filename`,
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
      `${apiPath}/email/:id/relay/:relayTo?`,
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
    this.app.get(`${apiPath}/reloadMailsFromDirectory`, async (_request, reply) => {
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
   * Delete one email using SMTP when available so delete events are emitted.
   */
  private async deleteEmail(id: string): Promise<boolean> {
    const email = await this.storage.getById(id)
    if (!email) {
      return false
    }

    if (this.smtp) {
      await this.smtp.deleteEmail(id)
      return true
    }

    return this.storage.delete(id)
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

    // Subscribe once and broadcast, rather than adding a pair of SMTP listeners
    // per connected socket — that grew with every open tab and tripped the
    // EventEmitter max-listeners warning.
    //
    // Only the summary goes over the wire: clients use the event to refresh
    // their list and show a notification, and shipping full bodies to every
    // tab on every delivery is what made a burst of mail so expensive.
    this.smtp.on('new', (email: Email) => {
      this.io?.emit('newMail', toSummary(email))
    })

    this.smtp.on('delete', (data: { id: string; index?: number }) => {
      this.io?.emit('deleteMail', data)
    })
  }

  /**
   * Setup MCP (Model Context Protocol) server for Claude integration
   */
  /**
   * Best-effort public base URL of the web UI (no trailing slash), derived
   * from this server's own listen options. Used for MCP email deep links when
   * no explicit URL is configured.
   */
  private defaultWebUrl(): string {
    const host = this.options.host ?? DEFAULT_HOST
    const printHost = host === '0.0.0.0' || host === '::' ? 'localhost' : host
    const port = this.options.port ?? DEFAULT_PORT
    const protocol = this.options.https ? 'https' : 'http'
    const basePath = this.options.basePath ?? ''
    return `${protocol}://${printHost}:${port}${basePath}`
  }

  private setupMCP(): void {
    if (!this.options.mcp?.enabled) {
      return
    }

    const basePath = this.options.basePath ?? ''

    // Create a data source adapter that uses direct storage access
    const dataSource: EmailDataSource = {
      getEmails: () => this.storage.getAll(),
      getEmail: async (id: string) => {
        const email = await this.storage.getById(id)
        if (!email) {
          throw new Error(`Email not found: ${id}`)
        }
        return email
      },
      deleteEmail: async (id: string) => {
        if (this.smtp) {
          await this.smtp.deleteEmail(id)
        } else {
          const deleted = await this.storage.delete(id)
          if (!deleted) {
            throw new Error(`Email not found: ${id}`)
          }
        }
      },
      getAttachment: async (emailId: string, filename: string) => {
        if (this.smtp) {
          const { stream } = await this.smtp.getEmailAttachment(emailId, filename)
          // Convert stream to buffer
          const chunks: Buffer[] = []
          for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk))
          }
          return Buffer.concat(chunks)
        }
        throw new Error('Attachments require SMTP server')
      },
    }

    // Deep links point at this server's own web UI unless an explicit public
    // URL is configured (e.g. when reached through a reverse proxy).
    const webUrl = this.options.mcp?.webUrl ?? this.defaultWebUrl()

    // Build a fresh MCP server for each session. A single `Server` instance can
    // only be bound to one transport at a time, so sharing one across sessions
    // makes the second `connect()` throw "Already connected to a transport".
    const createMcpServer = (): MCPServer => {
      const server = new MCPServer(
        { name: 'maildev', version: VERSION },
        { capabilities: { tools: {}, resources: {}, prompts: {} } }
      )
      registerMCPHandlers(server, dataSource, { webUrl })
      return server
    }

    // POST /mcp - Handle JSON-RPC requests
    this.app.post(`${basePath}/mcp`, async (request, reply) => {
      const sessionId = request.headers['mcp-session-id'] as string | undefined

      try {
        let transport = sessionId ? this.mcpTransports.get(sessionId) : undefined

        if (!transport) {
          // Only spin up a new session (and its own server) for an initialize
          // request. Any other request without a live session is a protocol
          // error — respond with a JSON-RPC error rather than silently opening
          // an orphaned transport.
          if (sessionId || !isInitializeRequest(request.body)) {
            return reply.status(400).send({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
              },
              id: null,
            })
          }

          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id) => {
              this.mcpTransports.set(id, transport!)
            },
            onsessionclosed: (id) => {
              this.mcpTransports.delete(id)
            },
          })

          await createMcpServer().connect(transport as unknown as Transport)
        }

        await transport.handleRequest(request.raw, reply.raw, request.body)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    })

    // GET /mcp - SSE stream for server notifications
    this.app.get(`${basePath}/mcp`, async (request, reply) => {
      const sessionId = request.headers['mcp-session-id'] as string

      if (!sessionId || !this.mcpTransports.has(sessionId)) {
        return reply.status(400).send({ error: 'Invalid or missing session ID' })
      }

      try {
        const transport = this.mcpTransports.get(sessionId)!
        await transport.handleRequest(request.raw, reply.raw)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    })

    // DELETE /mcp - Terminate session
    this.app.delete(`${basePath}/mcp`, async (request, reply) => {
      const sessionId = request.headers['mcp-session-id'] as string

      if (!sessionId || !this.mcpTransports.has(sessionId)) {
        return reply.status(400).send({ error: 'Invalid or missing session ID' })
      }

      try {
        const transport = this.mcpTransports.get(sessionId)!
        await transport.handleRequest(request.raw, reply.raw)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    })

    console.info(`MCP server enabled at ${basePath}/mcp`)
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
