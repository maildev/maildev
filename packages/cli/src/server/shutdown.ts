/**
 * MailDev Graceful Shutdown Handler
 *
 * Handles SIGTERM, SIGINT, and uncaught exceptions for clean server shutdown
 */

import type { Orchestrator } from './orchestrator.js'
import type { Logger } from '../utils/logger.js'

/**
 * Shutdown handler options
 */
export interface ShutdownOptions {
  orchestrator: Orchestrator
  logger: Logger
  /** Timeout before forcing exit (ms) */
  timeout?: number
}

/**
 * Setup graceful shutdown handlers
 *
 * Handles:
 * - SIGTERM (e.g., from docker stop, process managers)
 * - SIGINT (e.g., Ctrl+C)
 * - Uncaught exceptions
 * - Unhandled promise rejections
 */
export function setupShutdownHandlers(options: ShutdownOptions): void {
  const { orchestrator, logger, timeout = 10000 } = options
  let shuttingDown = false

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      logger.debug('Already shutting down, please wait...')
      return
    }

    shuttingDown = true
    logger.info('')
    logger.info(`Received ${signal}, shutting down gracefully...`)

    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit')
      process.exit(1)
    }, timeout)

    try {
      await orchestrator.stop()
      clearTimeout(forceExitTimeout)
      logger.success('Shutdown complete')
      process.exit(0)
    } catch (error) {
      clearTimeout(forceExitTimeout)
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Error during shutdown: ${message}`)
      process.exit(1)
    }
  }

  // Handle termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`)
    if (error.stack) {
      logger.debug(error.stack)
    }
    shutdown('uncaughtException')
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason)
    logger.error(`Unhandled rejection: ${message}`)
    shutdown('unhandledRejection')
  })
}

/**
 * Remove all shutdown handlers (useful for testing)
 */
export function removeShutdownHandlers(): void {
  process.removeAllListeners('SIGTERM')
  process.removeAllListeners('SIGINT')
  process.removeAllListeners('uncaughtException')
  process.removeAllListeners('unhandledRejection')
}
