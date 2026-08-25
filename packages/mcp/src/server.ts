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
  /**
   * Public base URL of the MailDev web UI (no trailing slash), used to build
   * email deep links in responses. Defaults to `MAILDEV_WEB_URL`, otherwise
   * derived from the API base URL.
   */
  webUrl?: string
}

/**
 * Derive the web UI base URL from the API base URL by dropping a trailing
 * `/api` segment (REST routes live under `<base>/api`, while the UI is served
 * from `<base>`). Trailing slashes are stripped so link building is uniform.
 */
function deriveWebUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '')
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
  const webUrl = options.webUrl || process.env.MAILDEV_WEB_URL || deriveWebUrl(client.getBaseUrl())
  registerMCPHandlers(server, client, { webUrl })

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
