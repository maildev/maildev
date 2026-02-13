#!/usr/bin/env node
/**
 * MailDev CLI Entry Point
 *
 * Main command-line interface for MailDev
 */

import { Command } from 'commander'
import { configureOptions, ENV_VARS, CONFIG_FILES } from '../options.js'
import { resolveConfig, validateConfig, formatValidationErrors } from '../config/index.js'
import type { CLIOptions } from '../config/types.js'
import { createOrchestrator, setupShutdownHandlers } from '../server/index.js'
import { createLogger } from '../utils/logger.js'
import { VERSION } from '../index.js'

// Initialize commander
const program = new Command()

program
  .name('maildev')
  .description('SMTP Server and Web Interface for email testing during development')
  .version(VERSION, '-V, --version', 'Output the version number')
  .addHelpText('after', ENV_VARS + CONFIG_FILES)

// Configure all CLI options
configureOptions(program)

// Add init subcommand
program
  .command('init')
  .description('Create a MailDev configuration file')
  .option('-f, --force', 'Overwrite existing configuration file')
  .option('--json', 'Create .maildevrc.json instead of maildev.config.js')
  .action(async (options) => {
    // Dynamic import to avoid loading init dependencies unless needed
    const { runInit } = await import('../commands/init.js')
    await runInit(options)
  })

// Main action (default when no subcommand)
program.action(async (options: CLIOptions) => {
  // Create logger (temporary, will reconfigure after config is resolved)
  const logger = createLogger({
    verbose: options.verbose ?? false,
    silent: options.silent ?? false,
  })

  try {
    // Resolve configuration from all sources
    const { config, configFilePath } = await resolveConfig(options)

    // Reconfigure logger with final settings
    logger.configure({
      verbose: config.verbose ?? false,
      silent: config.silent ?? false,
    })

    // Log config file if found
    if (configFilePath) {
      logger.debug(`Using config file: ${configFilePath}`)
    }

    // Validate configuration
    const validation = validateConfig(config)

    // Show warnings
    for (const warning of validation.warnings) {
      logger.warn(warning)
    }

    // Exit on validation errors
    if (!validation.valid) {
      logger.error(formatValidationErrors(validation))
      process.exit(1)
    }

    // Create orchestrator
    const orchestrator = createOrchestrator({
      config,
      logger,
    })

    // Setup graceful shutdown handlers
    setupShutdownHandlers({
      orchestrator,
      logger,
    })

    // Start servers
    await orchestrator.start()

    // Print startup banner
    const protocol = config.https ? 'https' : 'http'
    const webUrl = `${protocol}://${config.webIp === '0.0.0.0' ? 'localhost' : config.webIp}:${config.web}${config.basePathname}`

    logger.banner([
      'MailDev',
      `  Version: ${VERSION}`,
      '',
      '  SMTP Server',
      `    Address: ${config.ip}`,
      `    Port:    ${config.smtp}`,
      config.incomingUser ? '    Auth:    Enabled' : '',
      config.incomingSecure ? '    TLS:     Enabled' : '',
      '',
      ...(config.disableWeb
        ? ['  Web Interface: Disabled']
        : [
            '  Web Interface',
            `    URL:     ${webUrl}`,
            config.webUser ? '    Auth:    Enabled' : '',
            config.mcp ? `    MCP:     ${webUrl}mcp` : '',
          ]),
      '',
      ...(config.outgoingHost
        ? [
            '  Relay',
            `    Host:    ${config.outgoingHost}:${config.outgoingPort || 25}`,
            config.autoRelay ? '    Auto:    Enabled' : '',
          ]
        : []),
      '',
      '  Press Ctrl+C to stop',
    ].filter(Boolean))

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(message)
    if (options.verbose && error instanceof Error && error.stack) {
      logger.debug(error.stack)
    }
    process.exit(1)
  }
})

// Parse command line arguments
program.parse()
