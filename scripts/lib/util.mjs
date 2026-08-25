// Shared helpers for the site generator. No dependencies.

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escape a string for interpolation into HTML text or a double-quoted attribute. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}

/**
 * Depth of an output path, i.e. how many `../` segments are needed to reach the
 * site root from it. `index.html` -> 0, `docs/install/index.html` -> 2.
 */
export function depthOf(outputPath) {
  const segments = outputPath.split('/').filter(Boolean)
  return Math.max(0, segments.length - 1)
}

/** The `../`-prefix that reaches the site root from an output path. */
export function prefixFor(outputPath) {
  return '../'.repeat(depthOf(outputPath))
}

/**
 * Rewrite root-relative URLs (`/docs/foo/`) into depth-correct relative URLs so
 * the site works both at https://maildev.github.io/maildev/ and under
 * `make serve` at http://localhost:8000/ without a basePath rebuild.
 *
 * Authors and layouts always write root-relative; nothing hand-counts `../`.
 */
export function relativizeHtml(html, outputPath) {
  const prefix = prefixFor(outputPath)
  return html.replace(
    /\b(href|src|content)="\/(?!\/)([^"]*)"/g,
    // A link to the site root from a root-level page would otherwise collapse
    // to href="", which browsers resolve as "the current file".
    (_match, attr, rest) => `${attr}="${prefix + rest || './'}"`,
  )
}

/** Rewrite root-relative URLs to absolute ones (for markdown mirrors and feeds). */
export function absolutize(text, baseUrl) {
  return text.replace(/(\]\(|href="|src=")\/(?!\/)/g, (_m, lead) => `${lead}${baseUrl}/`)
}

/** Join the site base URL with a root-relative path. */
export function absoluteUrl(baseUrl, rootRelative) {
  return `${baseUrl}${rootRelative.startsWith('/') ? rootRelative : `/${rootRelative}`}`
}

/** Turn arbitrary heading text into a stable, lowercase anchor slug. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** `2026-08-25` -> `August 25, 2026`. Parsed as UTC so the output never shifts by timezone. */
export function formatDate(iso) {
  const [year, month, day] = String(iso).split('-').map(Number)
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[month - 1]} ${day}, ${year}`
}

/** RFC 822 date for RSS. Fixed midnight UTC keeps the feed byte-stable across builds. */
export function rfc822(iso) {
  const [year, month, day] = String(iso).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toUTCString()
}

/** Rough reading time in whole minutes, from rendered markdown source. */
export function readingTime(markdown) {
  const words = markdown.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

/** Deterministic JSON for generated manifests. */
export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}
