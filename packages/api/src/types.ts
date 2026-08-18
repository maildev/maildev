/**
 * @maildev/api - Type definitions
 */

import type { Storage, Email, EmailSummary } from '@maildev/core'
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
  /** Serve the API/UI over HTTPS (requires httpsCert and httpsKey) */
  https?: boolean
  /** Path to the HTTPS certificate file (PEM) */
  httpsCert?: string
  /** Path to the HTTPS private key file (PEM) */
  httpsKey?: string
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
 * Query parameters accepted by `GET /api/email/summary`
 */
export interface SummaryQuery {
  /** Number of results to skip */
  skip?: string
  /** Maximum number of results (clamped to MAX_PAGE_SIZE) */
  limit?: string
  /** Free-text search over subject, participants and body */
  search?: string
  /** Sort by received time: 'desc' (default) or 'asc' */
  sort?: string
  /** Only return unread emails when 'true' */
  unread?: string
}

/**
 * A page of email summaries plus the counts needed to render pagination
 */
export interface SummaryResponse {
  /** The requested page, newest first by default */
  items: EmailSummary[]
  /** Emails matching the query, ignoring skip/limit */
  total: number
  /** Emails held by the server, ignoring the query */
  storeTotal: number
  /** Unread emails held by the server, ignoring the query */
  unread: number
  /** The skip that was applied */
  skip: number
  /** The limit that was applied */
  limit: number
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
export type { Storage, Email, EmailSummary }
export type { SMTPServer }
