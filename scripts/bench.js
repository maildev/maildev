/**
 * MailDev - bench.js -- measure how the API behaves with a large inbox
 *
 * Fills a MemoryStorage with a lot of realistic emails, then times the calls
 * the web UI makes. Use it to check that a change hasn't reintroduced a
 * per-request scan of the whole store, or a response that grows with it.
 *
 * Requires a build first:
 *   pnpm build && node scripts/bench.js
 *
 * Options:
 *   COUNT=10000   how many emails to load (default 10000)
 *   BODY=12000    size of each message body in bytes (default 12000)
 *   FULL=1        also time GET /api/email, which serialises the whole inbox.
 *                 Off by default: past a few thousand emails it needs more heap
 *                 than node is given and takes the process down with it, which
 *                 is exactly the failure this work was about.
 */

const { MemoryStorage } = require('../packages/core/dist/index.js')
const { createAPIServer } = require('../packages/api/dist/index.js')

const COUNT = Number(process.env.COUNT ?? 10000)
const BODY_SIZE = Number(process.env.BODY ?? 12000)

const FILLER = 'Look at it! Once in a lifetime opportunity, man! '
const REPEATS = Math.ceil(BODY_SIZE / FILLER.length)

function makeEmail (index) {
  // Built per email rather than shared, so heap numbers reflect what a real
  // inbox of distinct messages actually costs
  const body = `Message ${index}. ` + FILLER.repeat(REPEATS)

  return {
    id: `email-${index}`,
    time: new Date(Date.now() - (COUNT - index) * 1000),
    read: false,
    subject: `Test message ${index}`,
    source: `/tmp/email-${index}.eml`,
    size: body.length,
    sizeHuman: `${Math.round(body.length / 1024)} KB`,
    from: [{ address: `sender${index % 50}@example.com`, name: `Sender ${index % 50}` }],
    to: [{ address: 'johnny.utah@fbi.gov', name: 'Johnny Utah' }],
    headers: { 'x-some-header': String(index) },
    attachments: [],
    envelope: {
      from: { address: `sender${index % 50}@example.com` },
      to: [{ address: 'johnny.utah@fbi.gov' }]
    },
    calculatedBcc: [],
    html: `<!DOCTYPE html><html><body><p>${body}</p></body></html>`,
    text: body
  }
}

async function time (label, fn) {
  const started = performance.now()
  const result = await fn()
  const elapsed = performance.now() - started
  console.log(`  ${label.padEnd(44)} ${elapsed.toFixed(1).padStart(9)} ms`)
  return result
}

function size (bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`
}

function payload (bytes) {
  console.log(`  ${''.padEnd(44)} ${size(bytes).padStart(12)}  payload`)
}

async function main () {
  const storage = new MemoryStorage()
  await storage.initialize()

  console.log(`\nMailDev API benchmark - ${COUNT} emails, ~${BODY_SIZE} byte bodies\n`)

  console.log('Storage')
  await time(`save ${COUNT} emails`, async () => {
    for (let i = 0; i < COUNT; i++) {
      await storage.save(makeEmail(i))
    }
  })
  await time('getById x1000 (spread across the store)', async () => {
    for (let i = 0; i < 1000; i++) {
      await storage.getById(`email-${(i * 7919) % COUNT}`)
    }
  })
  await time('stats', () => storage.stats())

  const server = createAPIServer({ storage, port: 0 })
  await server.registerPlugins()

  console.log('\nAPI')
  const page = await time('GET /api/email/summary (list view)', () =>
    server.server.inject({ method: 'GET', url: '/api/email/summary' })
  )
  payload(page.body.length)

  const search = await time('GET /api/email/summary?search=...', () =>
    server.server.inject({ method: 'GET', url: '/api/email/summary?search=message%209999' })
  )
  payload(search.body.length)

  const readAll = await time('PATCH /api/email/read-all', () =>
    server.server.inject({ method: 'PATCH', url: '/api/email/read-all' })
  )
  console.log(`  ${''.padEnd(44)} ${String(readAll.json()).padStart(12)}  marked read`)

  if (process.env.FULL) {
    const full = await time('GET /api/email (whole inbox, unpaginated)', () =>
      server.server.inject({ method: 'GET', url: '/api/email' })
    )
    payload(full.body.length)
  }

  console.log(`\nheap used: ${size(process.memoryUsage().heapUsed)}\n`)

  await server.stop()
  await storage.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
