// Loads and validates everything under content/ + data/, and resolves the
// sidebar order into per-page nav context (breadcrumb, prev/next, active state).

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { renderMarkdown } from './markdown.mjs'
import { readingTime } from './util.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')

const COMMON_KEYS = new Set([
  'title', 'description', 'ogTitle', 'ogDescription', 'ogImage', 'permalink',
  'aliases', 'canonical', 'noindex', 'updated', 'jsonLd',
])
const DOC_KEYS = new Set([...COMMON_KEYS, 'category', 'sidebarLabel', 'toc', 'sourceUrl'])
const POST_KEYS = new Set([...COMMON_KEYS, 'date', 'author', 'tags', 'draft', 'excerpt'])

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'))
}

function listMarkdown(dir) {
  const absolute = path.join(ROOT, dir)
  if (!fs.existsSync(absolute)) return []
  return fs
    .readdirSync(absolute, { recursive: true })
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => path.join(dir, entry).split(path.sep).join('/'))
    .sort()
}

function validateKeys(data, allowed, sourcePath) {
  for (const key of Object.keys(data)) {
    if (!allowed.has(key)) {
      throw new Error(`${sourcePath}: unknown front-matter key "${key}"`)
    }
  }
  for (const required of ['title', 'description']) {
    if (!data[required]) throw new Error(`${sourcePath}: missing required front matter "${required}"`)
  }
}

/** `content/docs/guides/docker.md` -> `docs/guides/docker` */
function idFor(sourcePath) {
  return sourcePath.replace(/^content\//, '').replace(/\.md$/, '')
}

/** Default URL for a docs page when front matter does not override it. */
function defaultPermalink(id) {
  return `/${id.replace(/^docs\//, 'docs/')}/`
}

function loadDoc(sourcePath) {
  const raw = fs.readFileSync(path.join(ROOT, sourcePath), 'utf8')
  const { data, content } = matter(raw)
  validateKeys(data, DOC_KEYS, sourcePath)

  const id = idFor(sourcePath)
  const permalink = data.permalink || defaultPermalink(id)
  if (!permalink.startsWith('/') || !permalink.endsWith('/')) {
    throw new Error(`${sourcePath}: permalink must start and end with "/" (got "${permalink}")`)
  }

  const { html, headings } = renderMarkdown(content)
  return {
    kind: 'doc',
    id,
    sourcePath,
    permalink,
    markdown: content,
    html,
    headings,
    outputPath: `${permalink.replace(/^\//, '')}index.html`,
    ...data,
    toc: data.toc !== false,
    aliases: data.aliases || [],
  }
}

function loadPost(sourcePath) {
  const raw = fs.readFileSync(path.join(ROOT, sourcePath), 'utf8')
  const { data, content } = matter(raw)
  validateKeys(data, POST_KEYS, sourcePath)
  if (!data.date) throw new Error(`${sourcePath}: blog posts require a "date"`)

  const filename = path.basename(sourcePath, '.md')
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/)
  if (!match) throw new Error(`${sourcePath}: blog filenames must be YYYY-MM-DD-slug.md`)
  const [, filenameDate, slug] = match
  const date = String(data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date)
  if (filenameDate !== date) {
    throw new Error(`${sourcePath}: front-matter date ${date} does not match filename date ${filenameDate}`)
  }

  const permalink = data.permalink || `/blog/${slug}/`
  const { html, headings } = renderMarkdown(content)
  return {
    kind: 'post',
    id: idFor(sourcePath),
    sourcePath,
    slug,
    permalink,
    markdown: content,
    html,
    headings,
    outputPath: `${permalink.replace(/^\//, '')}index.html`,
    readingMinutes: readingTime(content),
    ...data,
    date,
    draft: data.draft === true,
    tags: data.tags || [],
    aliases: data.aliases || [],
  }
}

/**
 * Load site data, docs, and blog posts; validate the nav manifest covers every
 * docs page exactly once; and attach sidebar/prev/next context to each page.
 */
export function loadContent({ includeDrafts = false } = {}) {
  const site = readJson('data/site.json')
  const nav = readJson('data/nav.json')

  const docs = listMarkdown('content/docs').map(loadDoc)
  const byId = new Map(docs.map((doc) => [doc.id, doc]))

  // The manifest is the single source of order. A page missing from it would
  // silently vanish from the sidebar, so that is a build failure, not a warning.
  const seen = new Set()
  const sections = nav.docs.map((section) => {
    const items = section.items.map((entry) => {
      const id = typeof entry === 'string' ? entry : entry.id
      const doc = byId.get(id)
      if (!doc) throw new Error(`data/nav.json: "${id}" does not resolve to a file under content/`)
      if (seen.has(id)) throw new Error(`data/nav.json: "${id}" is listed more than once`)
      seen.add(id)
      doc.section = section
      doc.sidebarLabel = (typeof entry === 'object' && entry.label) || doc.sidebarLabel || doc.title
      return doc
    })
    return { ...section, items }
  })

  const orphans = docs.filter((doc) => !seen.has(doc.id)).map((doc) => doc.sourcePath)
  if (orphans.length) {
    throw new Error(`Not listed in data/nav.json: ${orphans.join(', ')}`)
  }

  // Flattened sidebar order drives prev/next.
  const ordered = sections.flatMap((section) => section.items)
  ordered.forEach((doc, index) => {
    doc.prev = ordered[index - 1] || null
    doc.next = ordered[index + 1] || null
  })

  const posts = listMarkdown('content/blog')
    .map(loadPost)
    .filter((post) => includeDrafts || !post.draft)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug < b.slug ? -1 : 1))

  return { site, nav, sections, docs: ordered, posts }
}

export { ROOT }
