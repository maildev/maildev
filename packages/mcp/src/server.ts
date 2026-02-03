/**
 * MCP Server implementation for MailDev
 *
 * Provides tools, resources, and prompts for interacting with MailDev
 * via the Model Context Protocol.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { MailDevClient, type MailDevClientOptions } from './client.js'
import { registerMCPHandlers } from './handlers.js'

export interface MailDevMCPServerOptions extends MailDevClientOptions {
  /** Server name for MCP identification */
  name?: string
  /** Server version */
  version?: string
}

/**
 * Create and configure the MCP server
 */
export function createServer(options: MailDevMCPServerOptions = {}): Server {
  const client = new MailDevClient(options)
  const serverName = options.name || 'maildev-mcp'
  const serverVersion = options.version || '1.0.0'

  const server = new Server(
    { name: serverName, version: serverVersion },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  )

  // Register handlers using the HTTP client as the data source
  registerMCPHandlers(server, client)

  return server
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(options: MailDevMCPServerOptions = {}): Promise<void> {
  const server = createServer(options)
  const transport = new StdioServerTransport()

  await server.connect(transport)

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.close()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await server.close()
    process.exit(0)
  })
}
