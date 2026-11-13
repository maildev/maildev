/**
 * MailDev CLI Logger
 *
 * Logging utility that respects verbose/silent configuration
 */

import { format } from 'node:util'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LoggerOptions {
  verbose?: boolean
  silent?: boolean
  format?: 'text' | 'json'
}

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
} as const

/**
 * Check if colors should be used (TTY and not NO_COLOR)
 */
function useColors(): boolean {
  return (
    process.stdout.isTTY === true &&
    !process.env.NO_COLOR &&
    process.env.FORCE_COLOR !== '0'
  )
}

/**
 * Apply color if colors are enabled
 */
function color(text: string, colorCode: keyof typeof COLORS): string {
  if (!useColors()) return text
  return `${COLORS[colorCode]}${text}${COLORS.reset}`
}

/**
 * CLI Logger class
 */
export class Logger {
  private verbose: boolean
  private silent: boolean
  private format: 'text' | 'json'

  constructor(options: LoggerOptions = {}) {
    this.verbose = options.verbose ?? false
    this.silent = options.silent ?? false
    this.format = options.format ?? 'text'
  }

  /**
   * Update logger options
   */
  configure(options: LoggerOptions): void {
    if (options.verbose !== undefined) this.verbose = options.verbose
    if (options.silent !== undefined) this.silent = options.silent
    if (options.format !== undefined) this.format = options.format
  }


  private json(level: LogLevel, message: string, ...args: unknown[]): boolean {
    if (this.format !== 'json') return false
    const line = JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      message: format(message, ...args),
    })
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
    return true
  }
  /**
   * Log debug message (only in verbose mode)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.silent || !this.verbose) return
    if (this.json('debug', message, ...args)) return
    console.log(color(`[debug] ${message}`, 'dim'), ...args)
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.silent) return
    if (this.json('info', message, ...args)) return
    console.log(message, ...args)
  }

  /**
   * Log success message
   */
  success(message: string, ...args: unknown[]): void {
    if (this.silent) return
    if (this.json('info', message, ...args)) return
    console.log(color(message, 'green'), ...args)
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.silent) return
    if (this.json('warn', message, ...args)) return
    console.warn(color(`Warning: ${message}`, 'yellow'), ...args)
  }

  /**
   * Log error message (always shown unless silent)
   */
  error(message: string, ...args: unknown[]): void {
    if (this.silent) return
    if (this.json('error', message, ...args)) return
    console.error(color(`Error: ${message}`, 'red'), ...args)
  }

  /**
   * Log server startup banner
   */
  banner(lines: string[]): void {
    if (this.silent) return
    if (this.json('info', lines.join('\n'))) return
    console.log()
    for (const line of lines) {
      console.log(line)
    }
    console.log()
  }

  /**
   * Log a key-value pair
   */
  keyValue(key: string, value: string): void {
    if (this.silent) return
    if (this.json('info', `${key}: ${value}`)) return
    console.log(`  ${color(key + ':', 'cyan')} ${value}`)
  }

  /**
   * Log incoming email
   */
  email(from: string, to: string, subject: string): void {
    if (this.silent) return
    if (this.json('info', `Received: ${from} -> ${to}\nSubject: ${subject}`)) return
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0] ?? ''
    console.log(
      `${color(timestamp, 'dim')} ${color('Received:', 'green')} ${from} -> ${to}`
    )
    console.log(`  ${color('Subject:', 'cyan')} ${subject}`)
  }

  /**
   * Log email contents (JSON) if enabled
   */
  emailContents(email: unknown): void {
    if (this.silent) return
    if (this.format === 'json') {
      this.json('info', 'Email contents: %s', JSON.stringify(email))
      return
    }
    console.log(color('Email contents:', 'dim'))
    console.log(JSON.stringify(email, null, 2))
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger()

/**
 * Create a new logger instance
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options)
}
