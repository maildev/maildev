/**
 * maildev
 *
 * Main CLI package for MailDev - SMTP Server and Web Interface
 * for reading and testing emails during development.
 */

export const VERSION = '3.0.0-alpha.0'

// Re-export configuration types and utilities
export * from './config/types.js'
export { getDefaultConfig, DEFAULT_CONFIG } from './config/defaults.js'
export { loadConfig, discoverConfigFile, loadConfigFile } from './config/loader.js'
export { resolveConfig } from './config/merge.js'
export { validateConfig, formatValidationErrors, type ValidationResult, type ValidationError } from './config/validate.js'
export { loadEnvConfig, getEnvVarName } from './config/env.js'

// Re-export server orchestration
export { Orchestrator, createOrchestrator, type Servers, type OrchestratorOptions } from './server/orchestrator.js'
export { setupShutdownHandlers, removeShutdownHandlers, type ShutdownOptions } from './server/shutdown.js'

// Re-export logger
export { Logger, createLogger, type LogLevel, type LoggerOptions } from './utils/logger.js'

// Re-export CLI options configuration
export { configureOptions, ENV_VARS, CONFIG_FILES } from './options.js'

// Import for programmatic API
import type { MailDevConfig, PartialMailDevConfig } from './config/types.js'
import { getDefaultConfig } from './config/defaults.js'
import { createOrchestrator, type Servers } from './server/orchestrator.js'
import { createLogger } from './utils/logger.js'

/**
 * Main MailDev class for programmatic usage
 *
 * @example
 * ```typescript
 * import { MailDev } from 'maildev'
 *
 * const maildev = new MailDev({
 *   smtp: 1025,
 *   web: 1080,
 * })
 *
 * await maildev.start()
 *
 * // ... use maildev
 *
 * await maildev.stop()
 * ```
 */
export class MailDev {
  private orchestrator: ReturnType<typeof createOrchestrator>

  constructor(config: PartialMailDevConfig = {}) {
    const fullConfig: MailDevConfig = { ...getDefaultConfig(), ...config }
    const logger = createLogger({
      verbose: fullConfig.verbose ?? false,
      silent: fullConfig.silent ?? false,
    })

    this.orchestrator = createOrchestrator({
      config: fullConfig,
      logger,
    })
  }

  /**
   * Start MailDev servers
   */
  async start(): Promise<Servers> {
    return this.orchestrator.start()
  }

  /**
   * Stop MailDev servers
   */
  async stop(): Promise<void> {
    return this.orchestrator.stop()
  }

  /**
   * Check if servers are running
   */
  isRunning(): boolean {
    return this.orchestrator.isRunning()
  }

  /**
   * Get server instances
   */
  getServers(): Servers | null {
    return this.orchestrator.getServers()
  }
}

// Default export for convenience
export default MailDev
