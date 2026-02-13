/**
 * MailDev Configuration Merger
 *
 * Merges configuration from multiple sources with proper priority:
 * CLI args (highest) > Environment vars > Config file > Defaults (lowest)
 */

import type { MailDevConfig, PartialMailDevConfig, CLIOptions } from './types.js'
import { getDefaultConfig } from './defaults.js'
import { loadEnvConfig } from './env.js'
import { loadConfig } from './loader.js'
import type { HideableExtension } from '@maildev/smtp'

/**
 * Convert CLI options to partial config
 * Handles type coercion and naming differences
 */
function cliOptionsToConfig(options: CLIOptions): PartialMailDevConfig {
  const config: PartialMailDevConfig = {}

  // Port options (string to number)
  if (options.smtp !== undefined) {
    config.smtp = parseInt(options.smtp, 10)
  }
  if (options.web !== undefined) {
    config.web = parseInt(options.web, 10)
  }
  if (options.outgoingPort !== undefined) {
    config.outgoingPort = parseInt(options.outgoingPort, 10)
  }

  // String options
  if (options.ip !== undefined) config.ip = options.ip
  if (options.incomingUser !== undefined) config.incomingUser = options.incomingUser
  if (options.incomingPass !== undefined) config.incomingPass = options.incomingPass
  if (options.incomingCert !== undefined) config.incomingCert = options.incomingCert
  if (options.incomingKey !== undefined) config.incomingKey = options.incomingKey
  if (options.webIp !== undefined) config.webIp = options.webIp
  if (options.webUser !== undefined) config.webUser = options.webUser
  if (options.webPass !== undefined) config.webPass = options.webPass
  if (options.basePathname !== undefined) config.basePathname = options.basePathname
  if (options.httpsKey !== undefined) config.httpsKey = options.httpsKey
  if (options.httpsCert !== undefined) config.httpsCert = options.httpsCert
  if (options.outgoingHost !== undefined) config.outgoingHost = options.outgoingHost
  if (options.outgoingUser !== undefined) config.outgoingUser = options.outgoingUser
  if (options.outgoingPass !== undefined) config.outgoingPass = options.outgoingPass
  if (options.autoRelayRules !== undefined) config.autoRelayRules = options.autoRelayRules
  if (options.mailDirectory !== undefined) config.mailDirectory = options.mailDirectory
  if (options.config !== undefined) config.config = options.config

  // Boolean options
  if (options.incomingSecure !== undefined) config.incomingSecure = options.incomingSecure
  if (options.disableWeb !== undefined) config.disableWeb = options.disableWeb
  if (options.https !== undefined) config.https = options.https
  if (options.outgoingSecure !== undefined) config.outgoingSecure = options.outgoingSecure
  if (options.verbose !== undefined) config.verbose = options.verbose
  if (options.silent !== undefined) config.silent = options.silent
  if (options.logMailContents !== undefined)
    config.logMailContents = options.logMailContents
  if (options.mcp !== undefined) config.mcp = options.mcp

  // Auto-relay (can be boolean or string)
  if (options.autoRelay !== undefined) {
    config.autoRelay = options.autoRelay
  }

  // Hide extensions (comma-separated string to array)
  if (options.hideExtensions !== undefined) {
    config.hideExtensions = options.hideExtensions
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0) as HideableExtension[]
  }

  return config
}

/**
 * Merge partial config into base config
 * Only overwrites defined values
 */
function mergeConfig(
  base: MailDevConfig,
  partial: PartialMailDevConfig
): MailDevConfig {
  const result = { ...base }

  for (const [key, value] of Object.entries(partial)) {
    if (value !== undefined) {
      ;(result as Record<string, unknown>)[key] = value
    }
  }

  return result
}

/**
 * Resolve complete configuration from all sources
 *
 * Priority: CLI args > Environment vars > Config file > Defaults
 */
export async function resolveConfig(
  cliOptions: CLIOptions = {}
): Promise<{ config: MailDevConfig; configFilePath: string | null }> {
  // Start with defaults
  let config = getDefaultConfig()

  // Load config file (uses explicit path from CLI if provided)
  const { config: fileConfig, filePath } = await loadConfig(cliOptions.config)
  config = mergeConfig(config, fileConfig)

  // Load environment variables
  const envConfig = loadEnvConfig()
  config = mergeConfig(config, envConfig)

  // Apply CLI options (highest priority)
  const cliConfig = cliOptionsToConfig(cliOptions)
  config = mergeConfig(config, cliConfig)

  return { config, configFilePath: filePath }
}
