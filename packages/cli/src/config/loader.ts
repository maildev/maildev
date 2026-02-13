/**
 * MailDev Configuration File Loader
 *
 * Discovers and loads configuration files:
 * - .maildevrc.json
 * - maildev.config.ts
 * - maildev.config.js
 * - maildev.config.mjs
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { PartialMailDevConfig } from './types.js'

/**
 * Supported config file names in priority order
 */
const CONFIG_FILES = [
  '.maildevrc.json',
  'maildev.config.ts',
  'maildev.config.js',
  'maildev.config.mjs',
  'maildev.config.cjs',
]

/**
 * Find config file by walking up directory tree
 */
function findConfigFile(startDir: string, filename: string): string | null {
  let dir = startDir
  while (dir !== dirname(dir)) {
    const filePath = resolve(dir, filename)
    if (existsSync(filePath)) {
      return filePath
    }
    dir = dirname(dir)
  }
  return null
}

/**
 * Discover configuration file in current directory or ancestors
 */
export function discoverConfigFile(startDir: string = process.cwd()): string | null {
  for (const filename of CONFIG_FILES) {
    const found = findConfigFile(startDir, filename)
    if (found) return found
  }
  return null
}

/**
 * Load JSON configuration file
 */
async function loadJsonConfig(filePath: string): Promise<PartialMailDevConfig> {
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content) as PartialMailDevConfig
}

/**
 * Load JavaScript/TypeScript configuration file
 */
async function loadJsConfig(filePath: string): Promise<PartialMailDevConfig> {
  // For TypeScript files, we need tsx or ts-node to be available
  // For now, we'll use dynamic import which works for .js and .mjs
  const fileUrl = pathToFileURL(filePath).href
  const module = (await import(fileUrl)) as { default?: PartialMailDevConfig }
  return module.default ?? (module as unknown as PartialMailDevConfig)
}

/**
 * Load configuration from a specific file
 */
export async function loadConfigFile(
  filePath: string
): Promise<PartialMailDevConfig | null> {
  if (!existsSync(filePath)) {
    return null
  }

  const ext = filePath.split('.').pop()?.toLowerCase()

  try {
    if (ext === 'json') {
      return await loadJsonConfig(filePath)
    } else if (ext === 'ts' || ext === 'js' || ext === 'mjs' || ext === 'cjs') {
      return await loadJsConfig(filePath)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load config file ${filePath}: ${message}`)
  }

  return null
}

/**
 * Load configuration file with auto-discovery
 *
 * @param explicitPath - Explicit path from --config flag
 * @returns Configuration from file, or empty object if not found
 */
export async function loadConfig(
  explicitPath?: string
): Promise<{ config: PartialMailDevConfig; filePath: string | null }> {
  // If explicit path provided, use it
  if (explicitPath) {
    const resolvedPath = resolve(process.cwd(), explicitPath)
    const config = await loadConfigFile(resolvedPath)
    if (!config) {
      throw new Error(`Config file not found: ${explicitPath}`)
    }
    return { config, filePath: resolvedPath }
  }

  // Otherwise, auto-discover
  const discovered = discoverConfigFile()
  if (discovered) {
    const config = await loadConfigFile(discovered)
    return { config: config ?? {}, filePath: discovered }
  }

  return { config: {}, filePath: null }
}
