/**
 * MailDev Init Command
 *
 * Interactive setup wizard for creating configuration files
 */

import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { DEFAULT_CONFIG } from '../config/defaults.js'

/**
 * Init command options
 */
export interface InitOptions {
  force?: boolean
  json?: boolean
}

/**
 * Prompt for user input
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    const displayDefault = defaultValue !== undefined ? ` (${defaultValue})` : ''
    rl.question(`${question}${displayDefault}: `, (answer) => {
      rl.close()
      resolve(answer.trim() || defaultValue || '')
    })
  })
}

/**
 * Prompt for yes/no confirmation
 */
async function confirm(question: string, defaultValue: boolean = false): Promise<boolean> {
  const defaultStr = defaultValue ? 'Y/n' : 'y/N'
  const answer = await prompt(`${question} [${defaultStr}]`)
  if (!answer) return defaultValue
  return answer.toLowerCase().startsWith('y')
}

/**
 * Generate JSON configuration content
 */
function generateJsonConfig(config: Record<string, unknown>): string {
  return JSON.stringify(config, null, 2) + '\n'
}

/**
 * Generate JavaScript configuration content
 */
function generateJsConfig(config: Record<string, unknown>): string {
  const entries = Object.entries(config)
    .map(([key, value]) => {
      const valueStr = typeof value === 'string' ? `'${value}'` : String(value)
      return `  ${key}: ${valueStr},`
    })
    .join('\n')

  return `/**
 * MailDev Configuration
 * https://maildev.github.io/maildev/
 */
export default {
${entries}
}
`
}

/**
 * Run the init command
 */
export async function runInit(options: InitOptions): Promise<void> {
  const cwd = process.cwd()
  const filename = options.json ? '.maildevrc.json' : 'maildev.config.js'
  const filepath = join(cwd, filename)

  console.log()
  console.log('MailDev Configuration Setup')
  console.log('===========================')
  console.log()

  // Check for existing config
  if (existsSync(filepath) && !options.force) {
    console.log(`Configuration file already exists: ${filename}`)
    const overwrite = await confirm('Overwrite?', false)
    if (!overwrite) {
      console.log('Aborted.')
      return
    }
    console.log()
  }

  // Gather configuration options
  const config: Record<string, unknown> = {}

  // SMTP Port
  const smtpPort = await prompt('SMTP port', String(DEFAULT_CONFIG.smtp))
  if (smtpPort !== String(DEFAULT_CONFIG.smtp)) {
    config.smtp = parseInt(smtpPort, 10)
  }

  // Web Port
  const webPort = await prompt('Web interface port', String(DEFAULT_CONFIG.web))
  if (webPort !== String(DEFAULT_CONFIG.web)) {
    config.web = parseInt(webPort, 10)
  }

  // SMTP Auth
  const useSmtpAuth = await confirm('Enable SMTP authentication?', false)
  if (useSmtpAuth) {
    config.incomingUser = await prompt('SMTP username')
    config.incomingPass = await prompt('SMTP password')
  }

  // Web Auth
  const useWebAuth = await confirm('Enable web interface authentication?', false)
  if (useWebAuth) {
    config.webUser = await prompt('Web username')
    config.webPass = await prompt('Web password')
  }

  // Mail Directory
  const useMailDir = await confirm('Persist emails to disk?', false)
  if (useMailDir) {
    config.mailDirectory = await prompt('Mail directory path', './maildev-data')
  }

  // MCP
  const useMcp = await confirm('Enable MCP server for Claude integration?', false)
  if (useMcp) {
    config.mcp = true
  }

  // Relay
  const useRelay = await confirm('Configure email relay?', false)
  if (useRelay) {
    config.outgoingHost = await prompt('Relay SMTP host')
    const relayPort = await prompt('Relay SMTP port', '587')
    config.outgoingPort = parseInt(relayPort, 10)

    const useRelayAuth = await confirm('Relay requires authentication?', true)
    if (useRelayAuth) {
      config.outgoingUser = await prompt('Relay username')
      config.outgoingPass = await prompt('Relay password')
    }

    const useAutoRelay = await confirm('Enable auto-relay?', false)
    if (useAutoRelay) {
      const defaultRecipient = await prompt('Default recipient email (leave empty for original)')
      config.autoRelay = defaultRecipient || true
    }
  }

  console.log()

  // Generate and write config file
  const content = options.json
    ? generateJsonConfig(config)
    : generateJsConfig(config)

  writeFileSync(filepath, content, 'utf-8')

  console.log(`Configuration saved to ${filename}`)
  console.log()
  console.log('To start MailDev with this configuration:')
  console.log('  maildev')
  console.log()
  console.log('Or specify the config file explicitly:')
  console.log(`  maildev --config ${filename}`)
  console.log()
}
