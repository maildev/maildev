/**
 * @maildev/api
 *
 * REST API and WebSocket server for MailDev.
 */

export const VERSION = '3.0.0-alpha.0'

// Server
export { APIServer, createAPIServer } from './server.js'

// Types
export type {
  APIServerOptions,
  AuthConfig,
  CorsConfig,
  EmailQuery,
  ConfigResponse,
  APIServerEvents,
  DeleteResponse,
  ErrorResponse,
} from './types.js'

// Re-export relevant types from dependencies
export type { Storage, Email } from '@maildev/core'
