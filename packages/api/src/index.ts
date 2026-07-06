/**
 * @maildev/api
 *
 * REST API and WebSocket server for MailDev.
 */

// The value below is a dev-time fallback. On build, `scripts/set-version.mjs`
// rewrites this constant in dist/index.js to match package.json's version.
export const VERSION = '3.0.0-rc.1'

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
