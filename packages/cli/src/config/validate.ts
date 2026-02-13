/**
 * MailDev Configuration Validation
 *
 * Validates configuration and provides helpful error messages
 */

import { existsSync } from 'node:fs'
import type { MailDevConfig } from './types.js'

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: string[]
}

/**
 * Valid port range
 */
const MIN_PORT = 1
const MAX_PORT = 65535

/**
 * Validate port number
 */
function validatePort(port: number, field: string): ValidationError | null {
  if (!Number.isInteger(port)) {
    return { field, message: `${field} must be an integer` }
  }
  if (port < MIN_PORT || port > MAX_PORT) {
    return { field, message: `${field} must be between ${MIN_PORT} and ${MAX_PORT}` }
  }
  return null
}

/**
 * Validate file path exists
 */
function validateFilePath(
  path: string | undefined,
  field: string,
  required: boolean = false
): ValidationError | null {
  if (!path) {
    if (required) {
      return { field, message: `${field} is required` }
    }
    return null
  }
  if (!existsSync(path)) {
    return { field, message: `${field} file not found: ${path}` }
  }
  return null
}

/**
 * Validate complete configuration
 */
export function validateConfig(config: MailDevConfig): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Validate ports
  const smtpPortError = validatePort(config.smtp, 'smtp')
  if (smtpPortError) errors.push(smtpPortError)

  const webPortError = validatePort(config.web, 'web')
  if (webPortError) errors.push(webPortError)

  if (config.outgoingPort !== undefined) {
    const outgoingPortError = validatePort(config.outgoingPort, 'outgoingPort')
    if (outgoingPortError) errors.push(outgoingPortError)
  }

  // Validate TLS configuration
  if (config.incomingSecure) {
    if (!config.incomingCert) {
      errors.push({
        field: 'incomingCert',
        message: 'incomingCert is required when incomingSecure is enabled',
      })
    } else {
      const certError = validateFilePath(config.incomingCert, 'incomingCert')
      if (certError) errors.push(certError)
    }

    if (!config.incomingKey) {
      errors.push({
        field: 'incomingKey',
        message: 'incomingKey is required when incomingSecure is enabled',
      })
    } else {
      const keyError = validateFilePath(config.incomingKey, 'incomingKey')
      if (keyError) errors.push(keyError)
    }
  }

  // Validate HTTPS configuration
  if (config.https) {
    if (!config.httpsCert) {
      errors.push({
        field: 'httpsCert',
        message: 'httpsCert is required when https is enabled',
      })
    } else {
      const certError = validateFilePath(config.httpsCert, 'httpsCert')
      if (certError) errors.push(certError)
    }

    if (!config.httpsKey) {
      errors.push({
        field: 'httpsKey',
        message: 'httpsKey is required when https is enabled',
      })
    } else {
      const keyError = validateFilePath(config.httpsKey, 'httpsKey')
      if (keyError) errors.push(keyError)
    }
  }

  // Validate auth configurations
  if (config.incomingUser && !config.incomingPass) {
    errors.push({
      field: 'incomingPass',
      message: 'incomingPass is required when incomingUser is set',
    })
  }
  if (config.incomingPass && !config.incomingUser) {
    errors.push({
      field: 'incomingUser',
      message: 'incomingUser is required when incomingPass is set',
    })
  }

  if (config.webUser && !config.webPass) {
    errors.push({
      field: 'webPass',
      message: 'webPass is required when webUser is set',
    })
  }
  if (config.webPass && !config.webUser) {
    errors.push({
      field: 'webUser',
      message: 'webUser is required when webPass is set',
    })
  }

  // Validate relay configuration
  if (
    config.outgoingHost &&
    (config.outgoingUser || config.outgoingPass) &&
    !(config.outgoingUser && config.outgoingPass)
  ) {
    errors.push({
      field: 'outgoing',
      message: 'Both outgoingUser and outgoingPass are required for relay authentication',
    })
  }

  // Validate auto-relay rules file
  if (config.autoRelayRules) {
    const rulesError = validateFilePath(config.autoRelayRules, 'autoRelayRules')
    if (rulesError) errors.push(rulesError)
  }

  // Warnings
  if (config.smtp === config.web) {
    warnings.push('SMTP and Web ports are the same - this may cause conflicts')
  }

  if (config.verbose && config.silent) {
    warnings.push('Both verbose and silent are enabled - silent takes precedence')
  }

  if (config.disableWeb && (config.webUser || config.webPass)) {
    warnings.push('Web authentication is configured but web interface is disabled')
  }

  if (config.disableWeb && config.mcp) {
    warnings.push('MCP is enabled but web interface is disabled - MCP requires the web server')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Format validation errors for CLI output
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = []

  if (result.errors.length > 0) {
    lines.push('Configuration errors:')
    for (const error of result.errors) {
      lines.push(`  - ${error.field}: ${error.message}`)
    }
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push('Warnings:')
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`)
    }
  }

  return lines.join('\n')
}
