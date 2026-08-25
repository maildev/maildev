/**
 * @maildev/api
 *
 * REST API and WebSocket server for MailDev.
 */

// 'development' is the dev-time placeholder. On build, scripts/set-version.mjs
// rewrites this constant in dist/index.js to match package.json's version, so
// released artifacts report the real version.
export const VERSION = 'development'

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
