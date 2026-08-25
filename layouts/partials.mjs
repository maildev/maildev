// Docs-shell partials: sidebar, on-page TOC, breadcrumb, prev/next.

import { esc } from '../scripts/lib/util.mjs'

/**
 * The sidebar is a <details> element: on mobile it is a native disclosure
 * drawer, and above 900px CSS hides the <summary> and forces the nav open.
 * That keeps one copy of the ~20 links per page instead of two.
 */
export function sidebar(sections, current) {
  const groups = sections
    .map((section) => {
      const items = section.items
        .map((doc) => {
          const active = doc.id === current?.id
          return `            <li><a href="${esc(doc.permalink)}"${active ? ' aria-current="page"' : ''}>${esc(doc.sidebarLabel)}</a></li>`
        })
        .join('\n')
      return `        <div class="docs-nav-group">
          <p class="docs-nav-title">${esc(section.title)}</p>
          <ul>
${items}
          </ul>
        </div>`
    })
    .join('\n')

  // No `open` attribute: collapsed by default on mobile, while the CSS rule for
  // >=900px forces the nav visible so the desktop rail can never be shut.
  return `      <details class="docs-sidebar">
        <summary>Documentation menu</summary>
        <nav class="docs-nav" aria-label="Documentation">
${groups}
        </nav>
      </details>`
}

export function toc(headings) {
  if (!headings || headings.length < 2) return ''
  const items = headings
    .map(
      (heading) =>
        `          <li class="lvl-${heading.level}"><a href="#${esc(heading.id)}">${esc(heading.text)}</a></li>`,
    )
    .join('\n')
  return `      <nav class="docs-toc" aria-label="On this page">
        <p class="docs-nav-title">On this page</p>
        <ul>
${items}
        </ul>
      </nav>`
}

export function breadcrumb(doc) {
  const trail = [{ label: 'Docs', href: '/docs/' }]
  if (doc.section && doc.section.id !== 'getting-started') {
    trail.push({ label: doc.section.title, href: null })
  }
  const parts = trail
    .map((part) =>
      part.href
        ? `<a href="${esc(part.href)}">${esc(part.label)}</a>`
        : `<span>${esc(part.label)}</span>`,
    )
    .join('<span class="sep" aria-hidden="true">/</span>')
  return `        <nav class="docs-breadcrumb" aria-label="Breadcrumb">${parts}<span class="sep" aria-hidden="true">/</span><span>${esc(doc.sidebarLabel || doc.title)}</span></nav>`
}

export function prevNext(doc) {
  if (!doc.prev && !doc.next) return ''
  const card = (target, direction) => {
    if (!target) return '<span></span>'
    return `          <a class="prev-next-card" href="${esc(target.permalink)}" rel="${direction === 'Previous' ? 'prev' : 'next'}">
            <span class="prev-next-dir">${direction}</span>
            <span class="prev-next-title">${esc(target.sidebarLabel || target.title)}</span>
          </a>`
  }
  return `        <nav class="prev-next" aria-label="Pagination">
${card(doc.prev, 'Previous')}
${card(doc.next, 'Next')}
        </nav>`
}

export function pageMeta(doc, site) {
  const bits = []
  if (doc.updated) bits.push(`<span>Last updated ${esc(doc.updated)}</span>`)
  if (doc.sourceUrl) {
    bits.push(`<a href="${esc(doc.sourceUrl)}">Edit in the maildev repo</a>`)
  } else {
    bits.push(`<a href="${esc(site.links.editBase)}/${esc(doc.sourcePath)}">Edit this page</a>`)
  }
  return `        <p class="page-meta">${bits.join('<span class="sep" aria-hidden="true">·</span>')}</p>`
}
