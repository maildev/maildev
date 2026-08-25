// Markdown -> HTML pipeline. Emits markup that matches the hand-written classes
// already in assets/css/site.css, so generated pages are visually native.

import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import attrs from 'markdown-it-attrs'
import container from 'markdown-it-container'
import { createHighlighter } from 'shiki'
import { esc, slugify } from './util.mjs'

// Pinned theme. Code blocks are navy in BOTH color schemes on this site, so a
// single dark theme (not Shiki's dual-theme CSS-variable mode) is correct.
const THEME = 'github-dark-default'

const LANGS = [
  'bash', 'shell', 'console', 'dotenv', 'ini', 'properties', 'diff',
  'javascript', 'typescript', 'jsx', 'tsx', 'json', 'jsonc', 'json5',
  'html', 'xml', 'css', 'yaml', 'toml', 'sql', 'text',
  'python', 'ruby', 'php', 'java', 'kotlin', 'csharp', 'go', 'rust',
  'dockerfile', 'nginx', 'apache', 'groovy', 'erb', 'twig', 'blade',
]

const ICONS = {
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  tip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
}

let highlighter

/** Create the highlighter once and reuse it across pages and watch rebuilds. */
export async function initHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighter({ themes: [THEME], langs: LANGS })
  }
  return highlighter
}

/**
 * Shell commands keep the site's existing hand-written markup rather than Shiki
 * output: `.cmd::before` renders the `$ ` prompt in CSS, which means the copy
 * button copies a runnable command with no prompt to strip. Author these in
 * ```console fences and never type a literal `$`.
 */
function renderConsole(code) {
  const lines = code.replace(/\n$/, '').split('\n')
  const body = lines
    .map((line) => {
      if (!line.trim()) return ''
      if (line.trimStart().startsWith('#')) return `<span class="comment">${esc(line)}</span>`
      return `<span class="cmd">${esc(line)}</span>`
    })
    .join('\n')
  return `<pre><code>${body}</code></pre>\n`
}

function renderShiki(code, lang) {
  const known = highlighter.getLoadedLanguages().includes(lang)
  const html = highlighter.codeToHtml(code.replace(/\n$/, ''), {
    lang: known ? lang : 'text',
    theme: THEME,
  })
  // Drop Shiki's inline background/color so `pre { background: var(--navy) }`
  // in site.css stays authoritative in both color schemes.
  return `${html.replace(/(<pre[^>]*?) style="[^"]*"/, '$1').replace(/(<code[^>]*?) style="[^"]*"/, '$1')}\n`
}

function createRenderer() {
  const md = new MarkdownIt({ html: true, linkify: true, breaks: false })

  md.use(attrs, { allowedAttributes: ['id', 'class', 'target', 'rel'] })
  md.use(anchor, {
    slugify,
    level: [2, 3, 4],
    permalink: anchor.permalink.linkInsideHeader({
      symbol: '#',
      class: 'heading-anchor',
      placement: 'after',
      ariaHidden: true,
    }),
  })

  for (const kind of ['note', 'tip', 'warn']) {
    md.use(container, kind, {
      render(tokens, idx) {
        if (tokens[idx].nesting === 1) {
          return `<div class="callout callout-${kind}">${ICONS[kind]}<div>\n`
        }
        return '</div></div>\n'
      },
    })
  }

  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    const lang = (token.info || '').trim().split(/\s+/)[0].toLowerCase()
    if (lang === 'console' || lang === 'shellsession') return renderConsole(token.content)
    return renderShiki(token.content, lang || 'text')
  }

  // Tables inherit the comparison-table styling and the horizontal scroll wrapper.
  md.renderer.rules.table_open = () => '<div class="table-wrap"><table class="compare">\n'
  md.renderer.rules.table_close = () => '</table></div>\n'

  // External links open in a new tab; internal ones are left alone so the
  // root-relative -> relative rewrite in util.mjs can pick them up.
  const defaultLinkOpen = md.renderer.rules.link_open
    || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') || ''
    if (/^https?:\/\//.test(href) && !href.includes('maildev.github.io')) {
      tokens[idx].attrSet('rel', 'noopener')
    }
    return defaultLinkOpen(tokens, idx, options, env, self)
  }

  return md
}

let md

/** Add the yes/no cell classes the comparison table styling expects. */
function classifyCells(html) {
  return html
    .replace(/<td>(Yes\b[^<]*)<\/td>/g, '<td class="yes">$1</td>')
    .replace(/<td>(No\b[^<]*|—)<\/td>/g, '<td class="no">$1</td>')
}

/**
 * Render markdown to HTML and collect the heading outline for the on-page TOC.
 * @returns {{ html: string, headings: Array<{level: number, id: string, text: string}> }}
 */
export function renderMarkdown(source) {
  if (!md) md = createRenderer()
  const env = {}
  const tokens = md.parse(source, env)

  const headings = []
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.type !== 'heading_open') continue
    const level = Number(token.tag.slice(1))
    if (level !== 2 && level !== 3) continue
    const inline = tokens[i + 1]
    const text = (inline?.content || '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    headings.push({ level, id: token.attrGet('id') || slugify(text), text })
  }

  return { html: classifyCells(md.renderer.render(tokens, md.options, env)), headings }
}

/** Render a short inline snippet (blog excerpts, descriptions). */
export function renderInline(source) {
  if (!md) md = createRenderer()
  return md.renderInline(source)
}
