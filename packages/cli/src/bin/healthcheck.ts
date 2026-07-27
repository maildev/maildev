#!/usr/bin/env node
/**
 * MailDev container healthcheck
 *
 * Standalone entrypoint used by the Docker HEALTHCHECK. It reads the same
 * MAILDEV_* environment variables the server uses and probes the endpoint that
 * is actually listening:
 *
 *   - Web UI enabled  -> HTTP GET http://127.0.0.1:<web><basePath>/api/healthz
 *   - Web UI disabled -> TCP connect to 127.0.0.1:<smtp>
 *
 * Design notes (each addresses a reported bug):
 *   - Always targets `127.0.0.1`, never `localhost`, so it can't fail when
 *     `localhost` resolves to IPv6 (`::1`) but the server binds IPv4 only. (#537)
 *   - Falls back to the SMTP port when the web UI is disabled, so
 *     `--disable-web` containers still report healthy. (#544)
 *   - Normalizes the base path so a trailing slash can't produce a `//` in the
 *     probe URL. (#542)
 */

import net from 'node:net'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const DEFAULT_WEB_PORT = 1080
const DEFAULT_SMTP_PORT = 1025
const HOST = '127.0.0.1'
const TIMEOUT_MS = 2500

export interface HealthcheckPlan {
  mode: 'web' | 'smtp'
  host: string
  port: number
  /** Request path for `web` mode. */
  path?: string
}

function parseBoolean(value: string | undefined): boolean {
  if (value === undefined) return false
  return value.toLowerCase() === 'true' || value === '1'
}

function parsePort(value: string | undefined, fallback: number): number {
  const num = value ? parseInt(value, 10) : NaN
  return Number.isNaN(num) ? fallback : num
}

/** Normalize a base pathname to `''` or `/foo` (leading slash, no trailing slash). */
export function normalizeBasePath(raw: string | undefined): string {
  if (!raw || raw === '/') return ''
  let path = raw.trim()
  if (!path.startsWith('/')) path = `/${path}`
  return path.replace(/\/+$/, '')
}

/**
 * Decide what to probe based on the MailDev environment configuration.
 */
export function resolveHealthcheck(env: NodeJS.ProcessEnv): HealthcheckPlan {
  if (parseBoolean(env.MAILDEV_DISABLE_WEB)) {
    return {
      mode: 'smtp',
      host: HOST,
      port: parsePort(env.MAILDEV_SMTP_PORT, DEFAULT_SMTP_PORT),
    }
  }

  const basePath = normalizeBasePath(env.MAILDEV_BASE_PATHNAME)
  return {
    mode: 'web',
    host: HOST,
    port: parsePort(env.MAILDEV_WEB_PORT, DEFAULT_WEB_PORT),
    path: `${basePath}/api/healthz`,
  }
}

function checkWeb(plan: HealthcheckPlan): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      { host: plan.host, port: plan.port, path: plan.path, method: 'GET', timeout: TIMEOUT_MS },
      (res) => {
        res.resume() // drain
        const status = res.statusCode ?? 0
        resolve(status >= 200 && status < 300)
      }
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.end()
  })
}

function checkSmtp(plan: HealthcheckPlan): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: plan.host, port: plan.port })
    const finish = (ok: boolean) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(TIMEOUT_MS)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

/**
 * Run the healthcheck against the given environment. Resolves `true` when the
 * relevant MailDev service is reachable.
 */
export async function runHealthcheck(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const plan = resolveHealthcheck(env)
  return plan.mode === 'web' ? checkWeb(plan) : checkSmtp(plan)
}

// Run only when invoked directly as the bin entrypoint (not when imported by tests).
const isMain = process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  runHealthcheck()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch(() => process.exit(1))
}
