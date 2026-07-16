/**
 * MailDev Environment Variable Configuration
 *
 * Maps MAILDEV_* environment variables to configuration options
 */

import type { PartialMailDevConfig } from './types.js'

/**
 * Environment variable to config key mapping
 */
const ENV_MAPPING: Record<string, keyof PartialMailDevConfig> = {
  // SMTP
  MAILDEV_SMTP_PORT: 'smtp',
  MAILDEV_IP: 'ip',
  MAILDEV_INCOMING_USER: 'incomingUser',
  MAILDEV_INCOMING_PASS: 'incomingPass',

  // Web/API
  MAILDEV_WEB_PORT: 'web',
  MAILDEV_WEB_IP: 'webIp',
  MAILDEV_WEB_USER: 'webUser',
  MAILDEV_WEB_PASS: 'webPass',
  MAILDEV_BASE_PATHNAME: 'basePathname',
  MAILDEV_HTTPS_CERT: 'httpsCert',
  MAILDEV_HTTPS_KEY: 'httpsKey',

  // Outgoing/Relay
  MAILDEV_OUTGOING_HOST: 'outgoingHost',
  MAILDEV_OUTGOING_PORT: 'outgoingPort',
  MAILDEV_OUTGOING_USER: 'outgoingUser',
  MAILDEV_OUTGOING_PASS: 'outgoingPass',

  // Storage
  MAILDEV_MAIL_DIRECTORY: 'mailDirectory',

  // API URL (for MCP client mode)
  MAILDEV_API_URL: 'webIp', // Special handling needed
}

/**
 * Environment variables that should be parsed as numbers
 */
const NUMBER_VARS = new Set([
  'MAILDEV_SMTP_PORT',
  'MAILDEV_WEB_PORT',
  'MAILDEV_OUTGOING_PORT',
])

/**
 * Environment variables that should be parsed as booleans
 */
const BOOLEAN_VARS = new Set([
  'MAILDEV_INCOMING_SECURE',
  'MAILDEV_OUTGOING_SECURE',
  'MAILDEV_HTTPS',
  'MAILDEV_DISABLE_WEB',
  'MAILDEV_MCP',
  'MAILDEV_VERBOSE',
  'MAILDEV_SILENT',
])

/**
 * Parse boolean environment variable
 */
function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Load configuration from environment variables
 *
 * @returns Partial configuration from environment
 */
export function loadEnvConfig(): PartialMailDevConfig {
  const config: PartialMailDevConfig = {}

  for (const [envVar, configKey] of Object.entries(ENV_MAPPING)) {
    const value = process.env[envVar]
    if (value === undefined) continue

    if (NUMBER_VARS.has(envVar)) {
      const num = parseInt(value, 10)
      if (!isNaN(num)) {
        ;(config as Record<string, unknown>)[configKey] = num
      }
    } else {
      ;(config as Record<string, unknown>)[configKey] = value
    }
  }

  // Handle boolean environment variables
  for (const envVar of BOOLEAN_VARS) {
    const value = process.env[envVar]
    if (value !== undefined) {
      const key = envVarToConfigKey(envVar)
      if (key) {
        ;(config as Record<string, unknown>)[key] = parseBoolean(value)
      }
    }
  }

  return config
}

/**
 * Convert environment variable name to config key
 */
function envVarToConfigKey(envVar: string): keyof PartialMailDevConfig | null {
  // Remove MAILDEV_ prefix and convert to camelCase
  const withoutPrefix = envVar.replace(/^MAILDEV_/, '')
  const parts = withoutPrefix.toLowerCase().split('_')
  const camelCase = parts
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('')

  // Map specific env vars to config keys
  const mapping: Record<string, keyof PartialMailDevConfig> = {
    smtpPort: 'smtp',
    webPort: 'web',
    incomingSecure: 'incomingSecure',
    outgoingSecure: 'outgoingSecure',
    https: 'https',
    disableWeb: 'disableWeb',
    verbose: 'verbose',
    silent: 'silent',
    mcp: 'mcp',
  }

  return mapping[camelCase] || null
}

/**
 * Get environment variable name for a config key
 * (useful for error messages and documentation)
 */
export function getEnvVarName(configKey: keyof PartialMailDevConfig): string | null {
  for (const [envVar, key] of Object.entries(ENV_MAPPING)) {
    if (key === configKey) return envVar
  }
  return null
}
