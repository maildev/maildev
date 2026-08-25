#!/usr/bin/env node
// Vendors the code-versioned reference docs from the maildev repo's main branch
// into content/docs/reference/.
//
// Ownership split: this site is canonical for narrative docs (getting started,
// guides, integrations, comparisons, AI). The maildev repo is canonical for
// reference that has to track the code — the REST and programmatic APIs. Those
// pages are copied here rather than rewritten, so there is never a second
// hand-maintained version to rot.
//
//   node scripts/sync-docs.mjs           read from ../maildev/docs (sibling checkout)
//   node scripts/sync-docs.mjs --check   fail if the vendored copy is stale

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(import.meta.dirname, '..')
const SOURCE_REPO = path.resolve(ROOT, '../maildev')
const RAW_BASE = 'https://github.com/maildev/maildev/blob/main/docs'

const VENDORED = [
  {
    source: 'docs/rest.md',
    target: 'content/docs/reference/rest-api.md',
    frontMatter: {
      title: 'REST API',
      description:
        'The JSON API under /api for listing, reading, searching, downloading, relaying, and deleting mail — plus the Socket.IO events the web inbox uses for live updates.',
      ogTitle: 'MailDev REST API reference',
      permalink: '/docs/reference/rest-api/',
    },
  },
  {
    source: 'docs/api.md',
    target: 'content/docs/reference/node-api.md',
    frontMatter: {
      title: 'Programmatic API',
      description:
        'Embed MailDev in a Node.js application or test suite: construct a server, listen for mail events, read and delete messages, and swap the storage backend.',
      ogTitle: 'MailDev programmatic Node.js API',
      permalink: '/docs/reference/node-api/',
    },
  },
]

function sourceRevision() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'origin/main'], {
      cwd: SOURCE_REPO,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

/** Drop the leading H1 — the layout renders the title from front matter. */
function stripTitle(markdown) {
  return markdown.replace(/^#\s+.*\n+/, '')
}

/**
 * Rewrite cross-references between the vendored docs so they point at this
 * site's URLs rather than at relative paths that only resolve on GitHub.
 */
function rewriteLinks(markdown) {
  return markdown
    .replace(/\]\(\.\/rest\.md/g, '](/docs/reference/rest-api/')
    .replace(/\]\(\.\/api\.md/g, '](/docs/reference/node-api/')
    .replace(/\]\(\.\/mcp\.md/g, '](/docs/ai/mcp/')
    .replace(/\]\(\.\/docker\.md/g, '](/docs/guides/docker/')
    .replace(/\]\(\.\/https\.md/g, '](/docs/guides/https/')
    .replace(/\]\((rest|api|mcp|docker|https)\.md/g, (_m, name) => {
      const map = {
        rest: '/docs/reference/rest-api/',
        api: '/docs/reference/node-api/',
        mcp: '/docs/ai/mcp/',
        docker: '/docs/guides/docker/',
        https: '/docs/guides/https/',
      }
      return `](${map[name]}`
    })
}

function frontMatterBlock(fields) {
  const lines = Object.entries(fields).map(([key, value]) =>
    typeof value === 'string' && (value.includes(':') || value.length > 70)
      ? `${key}: >-\n  ${value}`
      : `${key}: ${value}`,
  )
  return `---\n${lines.join('\n')}\n---\n`
}

const check = process.argv.includes('--check')
const revision = sourceRevision()
let stale = 0

if (!fs.existsSync(SOURCE_REPO)) {
  console.error(`Source repo not found at ${SOURCE_REPO}.`)
  console.error('Clone maildev/maildev as a sibling directory, then re-run.')
  process.exit(1)
}

for (const entry of VENDORED) {
  const sourcePath = path.join(SOURCE_REPO, entry.source)
  if (!fs.existsSync(sourcePath)) {
    console.error(`Missing ${sourcePath}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(sourcePath, 'utf8')
  const digest = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12)
  const body = rewriteLinks(stripTitle(raw))

  // The recorded fingerprint is the source file's content hash, deliberately
  // NOT the upstream commit sha: otherwise every unrelated commit to main would
  // report these files as stale even though the documentation never changed.
  const contents = `${frontMatterBlock({
    ...entry.frontMatter,
    sourceUrl: `${RAW_BASE}/${path.basename(entry.source)}`,
  })}<!-- Vendored from maildev/maildev ${entry.source} (sha256:${digest}).
     Do not edit here: run \`make sync-docs\` after changing it upstream. -->

${body.trim()}\n`

  const targetPath = path.join(ROOT, entry.target)
  const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null

  if (existing === contents) {
    console.log(`up to date  ${entry.target}`)
    continue
  }

  if (check) {
    console.error(`STALE       ${entry.target} — run \`make sync-docs\``)
    stale += 1
    continue
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, contents)
  console.log(`synced      ${entry.target}  (${entry.source} @ ${revision})`)
}

if (stale) process.exit(1)
