import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { APIServer, createAPIServer } from '../server.js'
import { MemoryStorage, type Email } from '@maildev/core'

describe('APIServer', () => {
  let server: APIServer
  let storage: MemoryStorage

  beforeEach(async () => {
    storage = new MemoryStorage()
    await storage.initialize()
  })

  afterEach(async () => {
    if (server) {
      await server.stop()
    }
    await storage.close()
  })

  describe('createAPIServer', () => {
    it('should create an API server instance', () => {
      server = createAPIServer({ storage })
      expect(server).toBeInstanceOf(APIServer)
    })
  })

  describe('health check', () => {
    it('should return true on GET /api/healthz', async () => {
      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/healthz',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toBe(true)
    })
  })

  describe('config endpoint', () => {
    it('should return config on GET /api/config', async () => {
      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/config',
      })

      expect(response.statusCode).toBe(200)
      const config = response.json()
      expect(config.version).toBeDefined()
      expect(config.isOutgoingEnabled).toBe(false)
    })
  })

  describe('email routes', () => {
    it('should return empty array on GET /email when no emails', async () => {
      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual([])
    })

    it('should return emails on GET /email', async () => {
      const testEmail: Email = {
        id: 'test-123',
        time: new Date(),
        read: false,
        subject: 'Test Subject',
        source: '/path/to/email.eml',
        size: 1024,
        sizeHuman: '1.0 KB',
        from: [{ address: 'sender@example.com' }],
        to: [{ address: 'recipient@example.com' }],
        headers: {},
        attachments: [],
        envelope: {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }],
        },
        calculatedBcc: [],
      }
      await storage.save(testEmail)

      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email',
      })

      expect(response.statusCode).toBe(200)
      const emails = response.json()
      expect(emails).toHaveLength(1)
      expect(emails[0].id).toBe('test-123')
    })

    it('should return single email on GET /email/:id', async () => {
      const testEmail: Email = {
        id: 'test-456',
        time: new Date(),
        read: false,
        subject: 'Another Test',
        source: '/path/to/email.eml',
        size: 2048,
        sizeHuman: '2.0 KB',
        from: [{ address: 'from@example.com' }],
        to: [{ address: 'to@example.com' }],
        headers: {},
        attachments: [],
        envelope: {
          from: { address: 'from@example.com' },
          to: [{ address: 'to@example.com' }],
        },
        calculatedBcc: [],
      }
      await storage.save(testEmail)

      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email/test-456',
      })

      expect(response.statusCode).toBe(200)
      const email = response.json()
      expect(email.id).toBe('test-456')
      expect(email.subject).toBe('Another Test')
    })

    it('should mark email as read when fetched', async () => {
      const testEmail: Email = {
        id: 'test-789',
        time: new Date(),
        read: false,
        subject: 'Unread Email',
        source: '/path/to/email.eml',
        size: 512,
        sizeHuman: '512 B',
        from: [{ address: 'sender@test.com' }],
        to: [{ address: 'recipient@test.com' }],
        headers: {},
        attachments: [],
        envelope: {
          from: { address: 'sender@test.com' },
          to: [{ address: 'recipient@test.com' }],
        },
        calculatedBcc: [],
      }
      await storage.save(testEmail)

      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email/test-789',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().read).toBe(true)

      // Verify it was saved
      const saved = await storage.getById('test-789')
      expect(saved?.read).toBe(true)
    })

    it('should return 404 for non-existent email', async () => {
      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email/non-existent',
      })

      expect(response.statusCode).toBe(404)
      expect(response.json()).toEqual({ error: 'Email was not found' })
    })

    it('should delete email on DELETE /email/:id', async () => {
      const testEmail: Email = {
        id: 'delete-me',
        time: new Date(),
        read: false,
        subject: 'To Delete',
        source: '/path/to/email.eml',
        size: 256,
        sizeHuman: '256 B',
        from: [{ address: 'from@test.com' }],
        to: [{ address: 'to@test.com' }],
        headers: {},
        attachments: [],
        envelope: {
          from: { address: 'from@test.com' },
          to: [{ address: 'to@test.com' }],
        },
        calculatedBcc: [],
      }
      await storage.save(testEmail)

      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'DELETE',
        url: '/api/email/delete-me',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toBe(true)

      // Verify deletion
      const deleted = await storage.getById('delete-me')
      expect(deleted).toBeUndefined()
    })

    it('should delete all emails on DELETE /email/all', async () => {
      const emails: Email[] = [
        {
          id: 'email-1',
          time: new Date(),
          read: false,
          subject: 'Email 1',
          source: '/path/1.eml',
          size: 100,
          sizeHuman: '100 B',
          from: [{ address: 'a@test.com' }],
          to: [{ address: 'b@test.com' }],
          headers: {},
          attachments: [],
          envelope: { from: { address: 'a@test.com' }, to: [{ address: 'b@test.com' }] },
          calculatedBcc: [],
        },
        {
          id: 'email-2',
          time: new Date(),
          read: false,
          subject: 'Email 2',
          source: '/path/2.eml',
          size: 200,
          sizeHuman: '200 B',
          from: [{ address: 'c@test.com' }],
          to: [{ address: 'd@test.com' }],
          headers: {},
          attachments: [],
          envelope: { from: { address: 'c@test.com' }, to: [{ address: 'd@test.com' }] },
          calculatedBcc: [],
        },
      ]

      for (const email of emails) {
        await storage.save(email)
      }

      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'DELETE',
        url: '/api/email/all',
      })

      expect(response.statusCode).toBe(200)

      // Verify all deleted
      const remaining = await storage.getAll()
      expect(remaining).toHaveLength(0)
    })

    it('should filter emails by query parameters', async () => {
      const emails: Email[] = [
        {
          id: 'filter-1',
          time: new Date(),
          read: false,
          subject: 'From Alice',
          source: '/path/1.eml',
          size: 100,
          sizeHuman: '100 B',
          from: [{ address: 'alice@test.com' }],
          to: [{ address: 'bob@test.com' }],
          headers: {},
          attachments: [],
          envelope: { from: { address: 'alice@test.com' }, to: [{ address: 'bob@test.com' }] },
          calculatedBcc: [],
        },
        {
          id: 'filter-2',
          time: new Date(),
          read: false,
          subject: 'From Charlie',
          source: '/path/2.eml',
          size: 200,
          sizeHuman: '200 B',
          from: [{ address: 'charlie@test.com' }],
          to: [{ address: 'bob@test.com' }],
          headers: {},
          attachments: [],
          envelope: { from: { address: 'charlie@test.com' }, to: [{ address: 'bob@test.com' }] },
          calculatedBcc: [],
        },
      ]

      for (const email of emails) {
        await storage.save(email)
      }

      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email?from.address=alice@test.com',
      })

      expect(response.statusCode).toBe(200)
      const filtered = response.json()
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('filter-1')
    })
  })

  describe('authentication', () => {
    it('should allow requests when auth is not configured', async () => {
      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email',
      })

      expect(response.statusCode).toBe(200)
    })

    it('should require auth when configured', async () => {
      server = createAPIServer({
        storage,
        port: 0,
        auth: { type: 'basic', user: 'admin', pass: 'secret' },
      })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should accept valid basic auth credentials', async () => {
      server = createAPIServer({
        storage,
        port: 0,
        auth: { type: 'basic', user: 'admin', pass: 'secret' },
      })
      await server.start()

      const credentials = Buffer.from('admin:secret').toString('base64')
      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email',
        headers: {
          authorization: `Basic ${credentials}`,
        },
      })

      expect(response.statusCode).toBe(200)
    })

    it('should reject invalid credentials', async () => {
      server = createAPIServer({
        storage,
        port: 0,
        auth: { type: 'basic', user: 'admin', pass: 'secret' },
      })
      await server.start()

      const credentials = Buffer.from('admin:wrong').toString('base64')
      const response = await server.server.inject({
        method: 'GET',
        url: '/api/email',
        headers: {
          authorization: `Basic ${credentials}`,
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it('should skip auth for health check', async () => {
      server = createAPIServer({
        storage,
        port: 0,
        auth: { type: 'basic', user: 'admin', pass: 'secret' },
      })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/healthz',
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('base path', () => {
    it('should support custom base path', async () => {
      server = createAPIServer({ storage, port: 0, basePath: '/base' })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/base/api/healthz',
      })

      expect(response.statusCode).toBe(200)
    })

    it('should 404 on unprefixed route when base path is set', async () => {
      server = createAPIServer({ storage, port: 0, basePath: '/base' })
      await server.start()

      const response = await server.server.inject({
        method: 'GET',
        url: '/api/healthz',
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('MCP server', () => {
    it('should not have MCP routes when disabled', async () => {
      server = createAPIServer({ storage, port: 0 })
      await server.start()

      const response = await server.server.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        payload: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        },
      })

      expect(response.statusCode).toBe(404)
    })

    it('should initialize MCP session when enabled', async () => {
      server = createAPIServer({ storage, port: 0, mcp: { enabled: true } })
      await server.start()

      const response = await server.server.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        payload: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['mcp-session-id']).toBeDefined()

      // Parse SSE response
      const body = response.body
      expect(body).toContain('event: message')
      expect(body).toContain('"result"')
      expect(body).toContain('"serverInfo"')
      expect(body).toContain('"name":"maildev"')
    })

    it('should list MCP tools', async () => {
      server = createAPIServer({ storage, port: 0, mcp: { enabled: true } })
      await server.start()

      // First, initialize to get session ID
      const initResponse = await server.server.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        payload: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        },
      })

      const sessionId = initResponse.headers['mcp-session-id'] as string
      expect(sessionId).toBeDefined()

      // Now list tools
      const toolsResponse = await server.server.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId,
        },
        payload: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        },
      })

      expect(toolsResponse.statusCode).toBe(200)
      const body = toolsResponse.body

      // Should contain all 5 tools
      expect(body).toContain('maildev_search_emails')
      expect(body).toContain('maildev_get_email')
      expect(body).toContain('maildev_get_latest_email')
      expect(body).toContain('maildev_delete_email')
      expect(body).toContain('maildev_get_attachment')
    })

    it('should execute maildev_get_latest_email tool', async () => {
      // Add a test email
      const testEmail: Email = {
        id: 'mcp-test-email',
        time: new Date(),
        read: false,
        subject: 'MCP Test Email',
        text: 'This is a test email for MCP',
        source: '/path/to/email.eml',
        size: 512,
        sizeHuman: '512 B',
        from: [{ address: 'sender@mcp.test' }],
        to: [{ address: 'recipient@mcp.test' }],
        headers: {},
        attachments: [],
        envelope: {
          from: { address: 'sender@mcp.test' },
          to: [{ address: 'recipient@mcp.test' }],
        },
        calculatedBcc: [],
      }
      await storage.save(testEmail)

      server = createAPIServer({ storage, port: 0, mcp: { enabled: true } })
      await server.start()

      // Initialize session
      const initResponse = await server.server.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        payload: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        },
      })

      const sessionId = initResponse.headers['mcp-session-id'] as string

      // Call the tool
      const toolResponse = await server.server.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId,
        },
        payload: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'maildev_get_latest_email',
            arguments: {},
          },
        },
      })

      expect(toolResponse.statusCode).toBe(200)
      const body = toolResponse.body

      // Should contain the email data
      expect(body).toContain('MCP Test Email')
      expect(body).toContain('sender@mcp.test')
      expect(body).toContain('recipient@mcp.test')
      expect(body).toContain('This is a test email for MCP')
    })

    it('should execute maildev_search_emails tool with filters', async () => {
      // Add test emails
      const emails: Email[] = [
        {
          id: 'search-1',
          time: new Date(),
          read: false,
          subject: 'Welcome Email',
          text: 'Welcome to our service',
          source: '/path/1.eml',
          size: 100,
          sizeHuman: '100 B',
          from: [{ address: 'noreply@service.com' }],
          to: [{ address: 'user@example.com' }],
          headers: {},
          attachments: [],
          envelope: { from: { address: 'noreply@service.com' }, to: [{ address: 'user@example.com' }] },
          calculatedBcc: [],
        },
        {
          id: 'search-2',
          time: new Date(),
          read: false,
          subject: 'Password Reset',
          text: 'Click here to reset your password',
          source: '/path/2.eml',
          size: 200,
          sizeHuman: '200 B',
          from: [{ address: 'security@service.com' }],
          to: [{ address: 'user@example.com' }],
          headers: {},
          attachments: [],
          envelope: { from: { address: 'security@service.com' }, to: [{ address: 'user@example.com' }] },
          calculatedBcc: [],
        },
      ]

      for (const email of emails) {
        await storage.save(email)
      }

      server = createAPIServer({ storage, port: 0, mcp: { enabled: true } })
      await server.start()

      // Initialize session
      const initResponse = await server.server.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        payload: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        },
      })

      const sessionId = initResponse.headers['mcp-session-id'] as string

      // Search for password reset email
      const searchResponse = await server.server.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId,
        },
        payload: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'maildev_search_emails',
            arguments: {
              subject: 'Password',
            },
          },
        },
      })

      expect(searchResponse.statusCode).toBe(200)
      const body = searchResponse.body

      // Should find only the password reset email
      expect(body).toContain('Password Reset')
      expect(body).toContain('security@service.com')
      expect(body).not.toContain('Welcome Email')
    })

    it('should reject requests without Accept header', async () => {
      server = createAPIServer({ storage, port: 0, mcp: { enabled: true } })
      await server.start()

      const response = await server.server.inject({
        method: 'POST',
        url: '/mcp',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        },
      })

      // MCP transport returns 406 Not Acceptable when Accept header is missing
      expect(response.statusCode).toBe(406)
    })

    it('should support MCP with custom base path', async () => {
      server = createAPIServer({ storage, port: 0, basePath: '/api', mcp: { enabled: true } })
      await server.start()

      const response = await server.server.inject({
        method: 'POST',
        url: '/api/mcp',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        payload: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0' },
          },
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['mcp-session-id']).toBeDefined()
    })
  })
})
