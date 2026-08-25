#!/usr/bin/env node
// Site generator. Reads content/, data/, and layouts/; writes the static HTML
// that GitHub Pages serves from this branch.
//
//   node scripts/build.mjs            build once
//   node scripts/build.mjs --watch    rebuild on change
//   node scripts/build.mjs --check    build, then fail if anything changed
//   node scripts/build.mjs --clean    delete everything the last build wrote
//   node scripts/build.mjs --drafts   include draft blog posts
//
// Generated HTML is committed: push is deploy on this branch, so the build must
// never be a deploy-time dependency.

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadContent, ROOT } from './lib/content.mjs'
import { initHighlighter } from './lib/markdown.mjs'
import * as artifacts from './lib/artifacts.mjs'
import * as pages from '../layouts/pages.mjs'
import { prefixFor, relativizeHtml, stableJson } from './lib/util.mjs'

const MANIFEST = 'build.manifest.json'

// Paths the build must never write, whatever the content says.
const PROTECTED = [
  'assets/css/', 'assets/font/', 'assets/img/', 'assets/og/',
  'content/', 'data/', 'layouts/', 'scripts/',
  'package.json', 'package-lock.json', 'Makefile', 'README.md', 'DOCS_ROADMAP.md',
  'icon.svg', 'favicon.ico', '.nojekyll', '.gitignore',
]

const args = new Set(process.argv.slice(2))

function readIfExists(relative) {
  const absolute = path.join(ROOT, relative)
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : null
}

function previousManifest() {
  const raw = readIfExists(MANIFEST)
  if (!raw) return []
  try {
    return JSON.parse(raw).files || []
  } catch {
    return []
  }
}

/** Collect every output before touching disk, so a failure writes nothing. */
function buildOutputs({ site: rawSite, sections, docs, posts, nav }) {
  const out = new Map()

  // With no published posts there is no blog to link to. Drop /blog/ and its
  // feed rather than shipping an empty index that every page links at; it all
  // comes back on its own as soon as a post stops being a draft.
  const hasBlog = posts.length > 0
  const withoutBlog = (links) => links.filter((link) => !link.href.startsWith('/blog/'))
  const site = hasBlog
    ? { ...rawSite, hasBlog }
    : {
        ...rawSite,
        hasBlog,
        headerNav: withoutBlog(rawSite.headerNav),
        footerLinks: withoutBlog(rawSite.footerLinks),
      }

  const add = (outputPath, contents) => {
    if (out.has(outputPath)) throw new Error(`Two sources both write ${outputPath}`)
    for (const guard of PROTECTED) {
      if (outputPath === guard || outputPath.startsWith(guard)) {
        throw new Error(`Refusing to write protected path ${outputPath}`)
      }
    }
    out.set(outputPath, contents)
  }

  // ---- Landing page ------------------------------------------------------
  const homeBody = readIfExists('content/home.html')
  if (homeBody) {
    const homePage = {
      title: 'MailDev — Local SMTP server & email inbox for developers',
      documentTitle: 'MailDev — Local SMTP server & email inbox for developers',
      description:
        'MailDev is a free, open-source local SMTP server and web inbox that catches every email your app sends in development. Now with a built-in MCP server so AI agents like Claude, Cursor, and Codex can read your dev inbox.',
      ogTitle: 'MailDev — The local email inbox for developers',
      permalink: '/',
      sourcePath: 'content/home.html',
    }
    add('index.html', pages.home({ site, page: homePage, body: homeBody }))
  }

  // ---- Docs --------------------------------------------------------------
  for (const page of docs) {
    add(page.outputPath, pages.doc({ site, page, sections }))
  }

  // ---- Blog --------------------------------------------------------------
  if (hasBlog) {
    const blogPage = {
      title: 'Blog',
      description: 'Releases, guides, and notes from the MailDev project.',
      permalink: '/blog/',
      sourcePath: 'data/site.json',
    }
    add('blog/index.html', pages.blogIndex({ site, page: blogPage, posts }))
    add('blog/feed.xml', artifacts.feed({ site, posts }))
    for (const post of posts) {
      add(post.outputPath, pages.blogPost({ site, page: post }))
    }
  }

  // ---- Redirect stubs ----------------------------------------------------
  const targets = new Set([...docs.map((d) => d.permalink), ...posts.map((p) => p.permalink)])

  const emitRedirect = (from, to) => {
    const outputPath = `${from.replace(/^\//, '')}index.html`
    const relativeTo = `${prefixFor(outputPath)}${to.replace(/^\//, '')}`
    add(outputPath, pages.redirect({ site, from, to, relativeTo }))
  }

  // Per-page `aliases:` — every old URL a page used to live at.
  for (const page of [...docs, ...posts]) {
    for (const alias of page.aliases) {
      if (!alias.startsWith('/') || !alias.endsWith('/')) {
        throw new Error(`${page.sourcePath}: alias "${alias}" must start and end with "/"`)
      }
      if (targets.has(alias)) {
        throw new Error(`${page.sourcePath}: alias "${alias}" collides with a real page`)
      }
      emitRedirect(alias, page.permalink)
    }
  }

  for (const [from, to] of Object.entries(nav.redirects || {})) {
    if (!targets.has(to) && to !== '/') {
      throw new Error(`data/nav.json: redirect target ${to} does not exist`)
    }
    if (from.endsWith('.md')) {
      // A previously published .md URL. The per-page markdown mirrors were
      // retired, so these point at the HTML page instead of 404ing.
      add(from.replace(/^\//, ''), artifacts.mirrorRedirect({ site, to }))
      continue
    }
    emitRedirect(from, to)
  }

  // ---- Derived artifacts -------------------------------------------------
  add('404.html', pages.notFound({ site, sections }))
  add('sitemap.xml', artifacts.sitemap({ site, docs, posts }))
  add('robots.txt', artifacts.robots(site))
  add('llms.txt', artifacts.llms({
    site,
    intro: readIfExists('content/llms-intro.md') || '# MailDev',
    sections,
    posts,
  }))
  add('llms-full.txt', artifacts.llmsFull({ site, sections }))
  add('assets/js/site.js', artifacts.siteJs())

  return out
}

/**
 * Every root-relative internal link must resolve to something we emit (or a
 * static asset). This is the guard against shipping a site of broken links
 * after a rename.
 */
function checkLinks(outputs, site) {
  const known = new Set(outputs.keys())
  const problems = []

  const resolves = (target) => {
    const candidates = [target, `${target}index.html`, target.replace(/\/$/, '/index.html')]
    return (
      candidates.some((candidate) => known.has(candidate)) ||
      candidates.some((candidate) => fs.existsSync(path.join(ROOT, candidate)))
    )
  }

  // The markdown mirrors link with absolute URLs, so they are invisible to the
  // root-relative scan below. They are the agent-facing copy of the site; a
  // dead link there is just as broken.
  const selfLink = new RegExp(`${site.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^)\\s"'<>]*)`, 'g')
  for (const [outputPath, contents] of outputs) {
    if (!outputPath.endsWith('.md') && !outputPath.endsWith('.txt')) continue
    for (const match of contents.matchAll(selfLink)) {
      // An empty target is the bare site root, which resolves to index.html.
      const target = match[1].replace(/[.,;:]+$/, '')
      if (!resolves(target)) problems.push(`${outputPath} -> ${site.baseUrl}/${target}`)
    }
  }

  for (const [outputPath, contents] of outputs) {
    if (!outputPath.endsWith('.html')) continue
    for (const match of contents.matchAll(/\b(?:href|src)="\/(?!\/)([^"#?]*)/g)) {
      const target = match[1]
      if (!target) continue
      const candidates = [
        target,
        `${target}index.html`,
        target.replace(/\/$/, '/index.html'),
      ]
      const exists =
        candidates.some((candidate) => known.has(candidate)) ||
        candidates.some((candidate) => fs.existsSync(path.join(ROOT, candidate)))
      if (!exists) problems.push(`${outputPath} -> /${target}`)
    }
  }

  if (problems.length) {
    throw new Error(`Broken internal links:\n  ${[...new Set(problems)].join('\n  ')}`)
  }
}

/** URLs that must never disappear — a regression test encoded as data. */
function checkLegacyUrls(outputs) {
  const required = [
    'index.html', 'index.md',
    'setup/index.html', 'mcp/index.html', 'vs/mailcatcher/index.html',
    'setup.md', 'mcp.md', 'vs-mailcatcher.md',
    'sitemap.xml', 'robots.txt', 'llms.txt',
  ]
  const missing = required.filter((file) => !outputs.has(file))
  if (missing.length) throw new Error(`Previously published paths are missing: ${missing.join(', ')}`)
}

function writeOutputs(outputs) {
  let changed = 0
  for (const [outputPath, contents] of outputs) {
    const absolute = path.join(ROOT, outputPath)
    const final = outputPath.endsWith('.html') ? relativizeHtml(contents, outputPath) : contents
    if (readIfExists(outputPath) === final) continue
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
    fs.writeFileSync(absolute, final)
    changed += 1
  }

  // Remove files the previous build owned but this one no longer produces.
  const current = new Set(outputs.keys())
  let removed = 0
  for (const stale of previousManifest()) {
    if (current.has(stale)) continue
    const absolute = path.join(ROOT, stale)
    if (!fs.existsSync(absolute)) continue
    fs.rmSync(absolute)
    removed += 1
    let dir = path.dirname(absolute)
    while (dir !== ROOT && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir)
      dir = path.dirname(dir)
    }
  }

  fs.writeFileSync(
    path.join(ROOT, MANIFEST),
    stableJson({
      note: 'Generated by scripts/build.mjs. Lists every file the build owns.',
      files: [...outputs.keys()].sort(),
    }),
  )

  return { changed, removed }
}

function clean() {
  let removed = 0
  for (const file of previousManifest()) {
    const absolute = path.join(ROOT, file)
    if (!fs.existsSync(absolute)) continue
    fs.rmSync(absolute)
    removed += 1
  }
  fs.rmSync(path.join(ROOT, MANIFEST), { force: true })
  console.log(`Removed ${removed} generated files.`)
}

/**
 * Compare what the generator produces against what is on disk, without
 * writing. Deliberately independent of git state, so it answers "is the
 * committed output what this content produces?" rather than "is the tree clean?"
 */
function compareOutputs(outputs) {
  const differences = []
  for (const [outputPath, contents] of outputs) {
    const final = outputPath.endsWith('.html') ? relativizeHtml(contents, outputPath) : contents
    const existing = readIfExists(outputPath)
    if (existing === null) differences.push(`missing   ${outputPath}`)
    else if (existing !== final) differences.push(`stale     ${outputPath}`)
  }
  for (const stale of previousManifest()) {
    if (!outputs.has(stale) && fs.existsSync(path.join(ROOT, stale))) {
      differences.push(`orphaned  ${stale}`)
    }
  }
  return differences
}

async function build({ dryRun = false } = {}) {
  await initHighlighter()
  const content = loadContent({ includeDrafts: args.has('--drafts') })
  const outputs = buildOutputs(content)
  checkLinks(outputs, content.site)
  checkLegacyUrls(outputs)

  if (dryRun) {
    const differences = compareOutputs(outputs)
    if (differences.length) {
      console.error(`${differences.length} file(s) differ from the committed output:`)
      for (const line of differences) console.error(`  ${line}`)
      console.error("\nRun `make build` and commit the result.")
      process.exit(1)
    }
    console.log(`Up to date — ${outputs.size} files match the committed output.`)
    return outputs
  }

  const { changed, removed } = writeOutputs(outputs)
  console.log(
    `Built ${outputs.size} files (${content.docs.length} docs, ${content.posts.length} posts)` +
      ` — ${changed} written, ${removed} removed.`,
  )
  return outputs
}

if (args.has('--clean')) {
  clean()
} else if (args.has('--watch')) {
  await build()
  const debounce = { timer: null }
  const rebuild = () => {
    clearTimeout(debounce.timer)
    debounce.timer = setTimeout(() => {
      build().catch((error) => console.error(`\nBuild failed: ${error.message}\n`))
    }, 80)
  }
  // Content and data are re-read from disk on every rebuild, so watching them
  // is enough. The generator itself is not: it was imported once, and rebuilding
  // after editing it would silently run the stale in-memory version. Re-exec
  // instead, so a change to the generator actually takes effect.
  for (const dir of ['content', 'data']) {
    fs.watch(path.join(ROOT, dir), { recursive: true }, rebuild)
  }

  let restarting = false
  const restart = () => {
    if (restarting) return
    restarting = true
    console.log('\nGenerator changed — restarting the watcher...\n')
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
      stdio: 'inherit',
      detached: false,
    })
    child.on('exit', (code) => process.exit(code ?? 0))
  }
  for (const dir of ['layouts', 'scripts']) {
    fs.watch(path.join(ROOT, dir), { recursive: true }, restart)
  }

  console.log('Watching content/, data/, layouts/, scripts/ — ctrl-c to stop.')
} else {
  await build({ dryRun: args.has('--check') })
}
