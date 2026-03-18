import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import fastifyStatic from '@fastify/static'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface RegisterUIOptions {
  basePath?: string
}

export async function registerUI(
  fastify: FastifyInstance,
  options: RegisterUIOptions = {}
): Promise<void> {
  const basePath = options.basePath ?? ''
  const distPath = resolve(__dirname, '..', 'dist')

  await fastify.register(fastifyStatic, {
    root: distPath,
    prefix: basePath || '/',
    wildcard: false,
  })

  // SPA fallback - serves index.html for unmatched GET requests
  fastify.setNotFoundHandler(async (request, reply) => {
    const acceptHeader = request.headers.accept || ''
    if (request.method === 'GET' && acceptHeader.includes('text/html')) {
      return reply.sendFile('index.html')
    }
    return reply.status(404).send({ error: 'Not found' })
  })
}
