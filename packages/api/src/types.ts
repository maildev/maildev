/**
 * @maildev/api - Type definitions
 */

import type { Storage, Email } from '@maildev/core'
import type { SMTPServer } from '@maildev/smtp'

/**
 * API Server configuration options
 */
export interface APIServerOptions {
  /** Port to listen on (default: 1080) */
  port?: number
  /** Host to bind to (default: '0.0.0.0') */
  host?: string
  /** Base path for all routes (default: '/') */
  basePath?: string
  /** Storage backend for emails */
  storage: Storage
  /** SMTP server instance for events (optional) */
  smtp?: SMTPServer
  /** Authentication configuration */
  auth?: AuthConfig
  /** CORS configuration */
  cors?: CorsConfig
  /** Enable logging */
  logger?: boolean
  /** MCP server configuration */
  mcp?: MCPConfig
}

/**
 * MCP (Model Context Protocol) server configuration
 */
export interface MCPConfig {
  /** Enable MCP server at /mcp endpoint */
  enabled: boolean
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Authentication type */
  type: 'basic' | 'none'
  /** Username for basic auth */
  user?: string
  /** Password for basic auth */
  pass?: string
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  /** Allowed origins */
  origin?: string | string[] | boolean
  /** Allow credentials */
  credentials?: boolean
}

/**
 * Email query parameters for filtering
 */
export interface EmailQuery {
  /** Filter by sender email address (dot notation supported) */
  'from.address'?: string
  /** Filter by recipient email address (dot notation supported) */
  'to.address'?: string
  /** Filter by subject */
  subject?: string
  /** Filter by read status */
  read?: boolean
  /** Maximum number of results */
  limit?: number
  /** Number of results to skip */
  skip?: number
}

/**
 * Config response structure
 */
export interface ConfigResponse {
  version: string
  smtpPort?: number | undefined
  isOutgoingEnabled: boolean
  outgoingHost: string | null | undefined
}

/**
 * Request body for deleting multiple emails.
 */
export interface BulkDeleteEmailsRequest {
  ids: string[]
}

/**
 * Response for deleting multiple emails.
 */
export interface BulkDeleteEmailsResponse {
  deleted: string[]
  notFound: string[]
}

/**
 * API Server events
 */
export interface APIServerEvents {
  /** Emitted when server starts listening */
  listening: (info: { port: number; host: string }) => void
  /** Emitted when server closes */
  close: () => void
  /** Emitted on server errors */
  error: (error: Error) => void
}

/**
 * Delete response
 */
export interface DeleteResponse {
  success: boolean
  deleted?: number
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string
}

// Re-export types from other packages for convenience
export type { Storage, Email }
export type { SMTPServer }
