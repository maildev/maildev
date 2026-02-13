/**
 * MailDev CLI Configuration Types
 *
 * Complete configuration interface for MailDev v3 CLI
 * maintaining full backward compatibility with v2's options
 */

import type { HideableExtension } from '@maildev/smtp'

/**
 * SMTP server authentication configuration
 */
export interface SMTPAuthConfig {
  user: string
  pass: string
}

/**
 * TLS/SSL configuration for SMTP or HTTPS
 */
export interface TLSConfig {
  cert: string
  key: string
}

/**
 * Outgoing relay server configuration
 */
export interface RelayConfig {
  host: string
  port: number
  user?: string
  pass?: string
  secure?: boolean
}

/**
 * Auto-relay configuration
 */
export interface AutoRelayConfig {
  enabled: boolean
  recipient?: string
  rules?: string // Path to rules file
}

/**
 * Web/API server authentication configuration
 */
export interface WebAuthConfig {
  user: string
  pass: string
}

/**
 * Logging configuration
 */
export interface LogConfig {
  verbose: boolean
  silent: boolean
  logMailContents: boolean
}

/**
 * Complete MailDev configuration interface
 *
 * All 30+ options from v2 plus new v3 options
 */
export interface MailDevConfig {
  // === SMTP Server Options ===

  /**
   * SMTP server port
   * CLI: -s, --smtp <port>
   * Env: MAILDEV_SMTP_PORT
   * @default 1025
   */
  smtp: number

  /**
   * IP address to bind SMTP server
   * CLI: --ip <address>
   * Env: MAILDEV_IP
   * @default '::'
   */
  ip: string

  /**
   * SMTP authentication username
   * CLI: --incoming-user <user>
   */
  incomingUser?: string

  /**
   * SMTP authentication password
   * CLI: --incoming-pass <pass>
   */
  incomingPass?: string

  /**
   * Enable TLS/SSL for SMTP
   * CLI: --incoming-secure
   */
  incomingSecure?: boolean

  /**
   * Path to TLS certificate for SMTP
   * CLI: --incoming-cert <path>
   */
  incomingCert?: string

  /**
   * Path to TLS key for SMTP
   * CLI: --incoming-key <path>
   */
  incomingKey?: string

  /**
   * SMTP extensions to hide
   * CLI: --hide-extensions <list>
   * Comma-separated: STARTTLS,PIPELINING,8BITMIME,SMTPUTF8
   */
  hideExtensions?: HideableExtension[]

  // === Web/API Server Options ===

  /**
   * Web/API server port
   * CLI: -w, --web <port>
   * Env: MAILDEV_WEB_PORT
   * @default 1080
   */
  web: number

  /**
   * IP address to bind web server
   * CLI: --web-ip <address>
   * Env: MAILDEV_WEB_IP
   * @default '0.0.0.0'
   */
  webIp: string

  /**
   * Web interface HTTP auth username
   * CLI: --web-user <user>
   */
  webUser?: string

  /**
   * Web interface HTTP auth password
   * CLI: --web-pass <pass>
   */
  webPass?: string

  /**
   * Base URL pathname for web interface
   * CLI: --base-pathname <path>
   * @default '/'
   */
  basePathname: string

  /**
   * Disable web interface entirely
   * CLI: --disable-web
   */
  disableWeb?: boolean

  /**
   * Enable HTTPS for web server
   * CLI: --https
   */
  https?: boolean

  /**
   * Path to HTTPS key file
   * CLI: --https-key <file>
   */
  httpsKey?: string

  /**
   * Path to HTTPS certificate file
   * CLI: --https-cert <file>
   */
  httpsCert?: string

  // === Outgoing/Relay Options ===

  /**
   * Outgoing relay SMTP host
   * CLI: --outgoing-host <host>
   */
  outgoingHost?: string

  /**
   * Outgoing relay SMTP port
   * CLI: --outgoing-port <port>
   */
  outgoingPort?: number

  /**
   * Outgoing relay authentication username
   * CLI: --outgoing-user <user>
   */
  outgoingUser?: string

  /**
   * Outgoing relay authentication password
   * CLI: --outgoing-pass <password>
   */
  outgoingPass?: string

  /**
   * Use TLS/SSL for outgoing relay
   * CLI: --outgoing-secure
   */
  outgoingSecure?: boolean

  /**
   * Enable auto-relay mode
   * CLI: --auto-relay [email]
   * If email provided, all emails relay to that address
   */
  autoRelay?: boolean | string

  /**
   * Path to auto-relay rules file
   * CLI: --auto-relay-rules <file>
   */
  autoRelayRules?: string

  // === Storage Options ===

  /**
   * Directory for persisting emails
   * CLI: --mail-directory <path>
   * If not set, uses in-memory storage
   */
  mailDirectory?: string

  // === Logging Options ===

  /**
   * Enable verbose logging
   * CLI: -v, --verbose
   */
  verbose?: boolean

  /**
   * Suppress all output
   * CLI: --silent
   */
  silent?: boolean

  /**
   * Log JSON representation of emails
   * CLI: --log-mail-contents
   */
  logMailContents?: boolean

  // === v3 New Options ===

  /**
   * Enable MCP server at /mcp endpoint
   * CLI: --mcp
   * @default false
   */
  mcp?: boolean

  /**
   * Explicit config file path
   * CLI: --config <file>
   */
  config?: string
}

/**
 * Partial configuration (for merging)
 */
export type PartialMailDevConfig = Partial<MailDevConfig>

/**
 * CLI options as parsed by Commander.js
 * (may have different names/casing than config)
 */
export interface CLIOptions {
  smtp?: string
  ip?: string
  incomingUser?: string
  incomingPass?: string
  incomingSecure?: boolean
  incomingCert?: string
  incomingKey?: string
  hideExtensions?: string
  web?: string
  webIp?: string
  webUser?: string
  webPass?: string
  basePathname?: string
  disableWeb?: boolean
  https?: boolean
  httpsKey?: string
  httpsCert?: string
  outgoingHost?: string
  outgoingPort?: string
  outgoingUser?: string
  outgoingPass?: string
  outgoingSecure?: boolean
  autoRelay?: boolean | string
  autoRelayRules?: string
  mailDirectory?: string
  verbose?: boolean
  silent?: boolean
  logMailContents?: boolean
  mcp?: boolean
  config?: string
}
