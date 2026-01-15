/**
 * @maildev/smtp - Authentication handlers
 *
 * SMTP authentication callback handlers.
 */

import type { SMTPAuth } from './types.js'

/**
 * Authentication callback info from smtp-server
 */
interface AuthInfo {
  method: string
  username?: string
  password?: string
}

/**
 * Authentication session from smtp-server
 */
interface AuthSession {
  id: string
  remoteAddress: string
}

/**
 * Authentication callback function
 */
type AuthCallback = (error: Error | null, result?: { user: string }) => void

/**
 * Create an authentication callback for smtp-server
 *
 * @param credentials - Username and password credentials
 * @returns Authentication callback function
 */
export function createAuthCallback(
  credentials: SMTPAuth
): (auth: AuthInfo, session: AuthSession, callback: AuthCallback) => void {
  return function onAuth(
    auth: AuthInfo,
    _session: AuthSession,
    callback: AuthCallback
  ): void {
    if (!auth.username || !auth.password) {
      return callback(new Error('Username and password must be provided'))
    }

    if (auth.username !== credentials.user || auth.password !== credentials.pass) {
      return callback(new Error('Invalid username or password'))
    }

    callback(null, { user: credentials.user })
  }
}

/**
 * Create a no-op authentication callback that rejects all auth attempts
 * Used when auth is disabled
 */
export function createNoAuthCallback(): (
  auth: AuthInfo,
  session: AuthSession,
  callback: AuthCallback
) => void {
  return function onAuth(
    _auth: AuthInfo,
    _session: AuthSession,
    callback: AuthCallback
  ): void {
    callback(new Error('Authentication not enabled'))
  }
}
