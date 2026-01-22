#!/usr/bin/env node
/**
 * CLI entry point for the MailDev MCP server
 *
 * Usage:
 *   maildev-mcp [options]
 *
 * Environment variables:
 *   MAILDEV_API_URL - Base URL for MailDev API (default: http://localhost:1080)
 *   MAILDEV_API_KEY - Optional API key for authentication
 */

import { startServer } from './server.js'

const args = process.argv.slice(2)

// Simple argument parsing
let baseUrl: string | undefined
let apiKey: string | undefined

for (let i = 0; i < args.length; i++) {
  const arg = args[i]

  if (arg === '--url' || arg === '-u') {
    baseUrl = args[++i]
  } else if (arg === '--api-key' || arg === '-k') {
    apiKey = args[++i]
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
MailDev MCP Server

Usage: maildev-mcp [options]

Options:
  -u, --url <url>      MailDev API URL (default: http://localhost:1080)
  -k, --api-key <key>  API key for authentication
  -h, --help           Show this help message

Environment variables:
  MAILDEV_API_URL      Base URL for MailDev API
  MAILDEV_API_KEY      API key for authentication

Example Claude Desktop configuration:
{
  "mcpServers": {
    "maildev": {
      "command": "maildev-mcp",
      "args": [],
      "env": {
        "MAILDEV_API_URL": "http://localhost:1080"
      }
    }
  }
}
`)
    process.exit(0)
  } else if (arg === '--version' || arg === '-v') {
    console.log('maildev-mcp v3.0.0-alpha.0')
    process.exit(0)
  }
}

// Build options, only including defined values
const options: Parameters<typeof startServer>[0] = {}
if (baseUrl !== undefined) options.baseUrl = baseUrl
if (apiKey !== undefined) options.apiKey = apiKey

// Start the server
startServer(options).catch((error) => {
  console.error('Failed to start MCP server:', error)
  process.exit(1)
})
