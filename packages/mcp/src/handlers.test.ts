import { describe, expect, it } from 'vitest'
import {
  CallToolRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type { Email } from '@maildev/core'
import { registerMCPHandlers, type EmailDataSource } from './handlers.js'

/**
 * Minimal fake MCP Server that records request handlers by schema so tests can
 * invoke them directly without a transport.
 */
function createFakeServer() {
  const handlers = new Map<unknown, (request: unknown) => Promise<unknown>>()
  const server = {
    setRequestHandler(schema: unknown, handler: (request: unknown) => Promise<unknown>) {
      handlers.set(schema, handler)
    },
  }
  return { server, handlers }
}

function makeEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: 'abc123',
    time: new Date('2024-01-01T00:00:00Z').getTime(),
    read: true,
    subject: 'Hello',
    from: [{ address: 'sender@example.com', name: 'Sender' }],
    to: [{ address: 'recipient@example.com', name: 'Recipient' }],
    text: 'body',
    ...overrides,
  } as Email
}

function dataSourceFor(email: Email): EmailDataSource {
  return {
    getEmails: async () => [email],
    getEmail: async () => email,
    deleteEmail: async () => undefined,
    getAttachment: async () => Buffer.from(''),
  } as unknown as EmailDataSource
}

async function callTool(
  handlers: Map<unknown, (request: unknown) => Promise<unknown>>,
  name: string,
  args: Record<string, unknown> = {}
): Promise<string> {
  const handler = handlers.get(CallToolRequestSchema)!
  const result = (await handler({ params: { name, arguments: args } })) as {
    content: Array<{ type: string; text: string }>
  }
  return result.content.map((c) => c.text).join('\n')
}

describe('MCP email deep links', () => {
  it('includes a hash-route URL in get_email output when webUrl is set', async () => {
    const { server, handlers } = createFakeServer()
    registerMCPHandlers(server as never, dataSourceFor(makeEmail()), {
      webUrl: 'http://localhost:1080',
    })

    const text = await callTool(handlers, 'maildev_get_email', { id: 'abc123' })

    expect(text).toContain('URL: http://localhost:1080/#/email/abc123')
  })

  it('omits the URL line when no webUrl is configured', async () => {
    const { server, handlers } = createFakeServer()
    registerMCPHandlers(server as never, dataSourceFor(makeEmail()))

    const text = await callTool(handlers, 'maildev_get_email', { id: 'abc123' })

    expect(text).not.toContain('URL:')
  })

  it('encodes ids and strips trailing slashes from the base URL', async () => {
    const { server, handlers } = createFakeServer()
    registerMCPHandlers(server as never, dataSourceFor(makeEmail({ id: 'a b/c' })), {
      webUrl: 'http://localhost:1080/mail/',
    })

    const text = await callTool(handlers, 'maildev_get_latest_email', {})

    expect(text).toContain('URL: http://localhost:1080/mail/#/email/a%20b%2Fc')
  })

  it('adds a url field to the email resource JSON', async () => {
    const { server, handlers } = createFakeServer()
    registerMCPHandlers(server as never, dataSourceFor(makeEmail()), {
      webUrl: 'http://localhost:1080',
    })

    const handler = handlers.get(ReadResourceRequestSchema)!
    const result = (await handler({ params: { uri: 'maildev://email/abc123' } })) as {
      contents: Array<{ text: string }>
    }
    const payload = JSON.parse(result.contents[0]!.text)

    expect(payload.url).toBe('http://localhost:1080/#/email/abc123')
  })
})
