/**
 * @maildev/mcp
 *
 * MCP (Model Context Protocol) server for Claude integration with MailDev.
 *
 * This package provides:
 * - MCP tools for email operations (search, get, delete, relay)
 * - MCP resources for accessing email data
 * - MCP prompts for common email testing workflows
 */

// 'development' is the dev-time placeholder. On build, scripts/set-version.mjs
// rewrites this constant in dist/index.js to match package.json's version, so
// released artifacts report the real version.
export const VERSION = 'development'

// Server
export { createServer, startServer, type MailDevMCPServerOptions } from './server.js'

// Handlers (for integration into other servers)
export { registerMCPHandlers, type EmailDataSource } from './handlers.js'

// Client (for programmatic access)
export {
  MailDevClient,
  type MailDevClientOptions,
  type MailDevStats,
  type SearchOptions,
} from './client.js'
