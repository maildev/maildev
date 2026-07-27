import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance, FastifyReply } from 'fastify'
import fastifyStatic from '@fastify/static'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface RegisterUIOptions {
  basePath?: string
  /** Directory containing the built UI. Defaults to the packaged `dist/`. */
  distPath?: string
}

/** Strip trailing slashes: '/mail/' -> '/mail', '/' -> ''. */
function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '')
}

/**
 * Inject a `<base href="{basePath}/">` tag into index.html.
 *
 * The Vite build emits relative asset URLs (`base: './'`), and the client
 * derives its REST/Socket.io prefixes from `document.baseURI`. Both rely on
 * this tag so MailDev can be served at the root or under a reverse-proxy
 * sub-path without a rebuild.
 */
export function injectBaseTag(html: string, basePath: string): string {
  const href = `${stripTrailingSlash(basePath)}/`
  return html.replace(
    /<head(\s[^>]*)?>/i,
    (match) => `${match}\n    <base href="${href}" />`
  )
}

export async function registerUI(
  fastify: FastifyInstance,
  options: RegisterUIOptions = {}
): Promise<void> {
  const basePath = stripTrailingSlash(options.basePath ?? '')
  const distPath = options.distPath ?? resolve(__dirname, '..', 'dist')

  // Pre-render index.html with the <base> tag for the configured base path.
  const rawIndex = await readFile(resolve(distPath, 'index.html'), 'utf8')
  const indexHtml = injectBaseTag(rawIndex, basePath)
  const sendIndex = (reply: FastifyReply) =>
    reply.type('text/html').send(indexHtml)

  // Serve hashed assets under the base path prefix. `index: false` leaves
  // index.html to the handlers below so the injected <base> tag is always used.
  await fastify.register(fastifyStatic, {
    root: distPath,
    prefix: basePath || '/',
    wildcard: false,
    index: false,
  })

  // SPA fallback - serves index.html for unmatched GET requests (incl. the
  // base path root itself, which `index: false` no longer auto-serves).
  fastify.setNotFoundHandler(async (request, reply) => {
    const acceptHeader = request.headers.accept || ''
    if (request.method === 'GET' && acceptHeader.includes('text/html')) {
      return sendIndex(reply)
    }
    return reply.status(404).send({ error: 'Not found' })
  })
}
