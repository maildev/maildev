/**
 * MailDev CLI Option Definitions
 *
 * All Commander.js options matching v2 exactly plus new v3 options
 */

import { Command } from 'commander'
import { DEFAULT_CONFIG } from './config/defaults.js'

/**
 * Configure all CLI options on the Commander program
 *
 * Maintains exact compatibility with v2 CLI flags
 */
export function configureOptions(program: Command): void {
  program
    // === SMTP Server Options ===
    // Note: defaults are NOT set here to allow env vars to work properly
    // Defaults are applied in config/merge.ts via getDefaultConfig()
    .option(
      '-s, --smtp <port>',
      `SMTP port to listen on (default: ${DEFAULT_CONFIG.smtp})`
    )
    .option(
      '--ip <address>',
      `IP address to bind SMTP server (default: ${DEFAULT_CONFIG.ip})`
    )
    .option(
      '--incoming-user <user>',
      'SMTP authentication username'
    )
    .option(
      '--incoming-pass <password>',
      'SMTP authentication password'
    )
    .option(
      '--incoming-secure',
      'Enable TLS/SSL for SMTP server'
    )
    .option(
      '--incoming-cert <path>',
      'Path to TLS certificate for SMTP'
    )
    .option(
      '--incoming-key <path>',
      'Path to TLS key for SMTP'
    )
    .option(
      '--hide-extensions <extensions>',
      'Comma-separated SMTP extensions to hide (STARTTLS,PIPELINING,8BITMIME,SMTPUTF8)'
    )

    // === Web/API Server Options ===
    .option(
      '-w, --web <port>',
      `Web/API port to listen on (default: ${DEFAULT_CONFIG.web})`
    )
    .option(
      '--web-ip <address>',
      `IP address to bind web server (default: ${DEFAULT_CONFIG.webIp})`
    )
    .option(
      '--web-user <user>',
      'Web interface HTTP basic auth username'
    )
    .option(
      '--web-pass <password>',
      'Web interface HTTP basic auth password'
    )
    .option(
      '--base-pathname <path>',
      `Base URL pathname for web interface (default: ${DEFAULT_CONFIG.basePathname})`
    )
    .option(
      '--disable-web',
      'Disable web interface entirely'
    )
    .option(
      '--https',
      'Enable HTTPS for web server'
    )
    .option(
      '--https-key <path>',
      'Path to HTTPS private key file'
    )
    .option(
      '--https-cert <path>',
      'Path to HTTPS certificate file'
    )

    // === Outgoing/Relay Options ===
    .option(
      '--outgoing-host <host>',
      'Outgoing relay SMTP host'
    )
    .option(
      '--outgoing-port <port>',
      'Outgoing relay SMTP port'
    )
    .option(
      '--outgoing-user <user>',
      'Outgoing relay SMTP username'
    )
    .option(
      '--outgoing-pass <password>',
      'Outgoing relay SMTP password'
    )
    .option(
      '--outgoing-secure',
      'Use TLS/SSL for outgoing relay'
    )
    .option(
      '--auto-relay [email]',
      'Enable auto-relay mode (optionally specify recipient email)'
    )
    .option(
      '--auto-relay-rules <path>',
      'Path to auto-relay rules JSON file'
    )

    // === Storage Options ===
    .option(
      '--mail-directory <path>',
      'Directory to persist emails (uses in-memory storage if not set)'
    )

    // === Logging Options ===
    .option(
      '-v, --verbose',
      'Enable verbose logging'
    )
    .option(
      '--silent',
      'Suppress all output'
    )
    .option(
      '--log-mail-contents',
      'Log JSON representation of received emails'
    )

    // === v3 New Options ===
    .option(
      '--mcp',
      'Enable MCP server at /mcp endpoint'
    )
    .option(
      '--config <path>',
      'Path to configuration file'
    )
}

/**
 * Environment variable documentation for help text
 */
export const ENV_VARS = `
Environment Variables:
  MAILDEV_SMTP_PORT     SMTP port (default: 1025)
  MAILDEV_IP            SMTP bind address (default: ::)
  MAILDEV_WEB_PORT      Web port (default: 1080)
  MAILDEV_WEB_IP        Web bind address (default: 0.0.0.0)
  MAILDEV_INCOMING_USER SMTP username
  MAILDEV_INCOMING_PASS SMTP password
  MAILDEV_WEB_USER      Web auth username
  MAILDEV_WEB_PASS      Web auth password
  MAILDEV_MAIL_DIRECTORY Directory for persisting emails
`

/**
 * Configuration file documentation
 */
export const CONFIG_FILES = `
Configuration Files (searched in current directory and parents):
  .maildevrc.json       JSON configuration
  maildev.config.ts     TypeScript configuration
  maildev.config.js     JavaScript configuration
  maildev.config.mjs    ES module configuration
`
