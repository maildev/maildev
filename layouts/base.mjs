// The single source of truth for every page's chrome: head, meta, header nav,
// footer, and scripts. Nothing else in the repo emits <html>.

import { absoluteUrl, esc } from '../scripts/lib/util.mjs'

const BRAND_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="currentColor" />
            <g fill="none" stroke="#FAFAFA" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="14" y="20" width="36" height="26" rx="4" />
              <path d="M14.5 23.5 L32 36 L49.5 23.5" />
            </g>
          </svg>`

const GITHUB_SVG = `<svg class="gh" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`

const STAR_SVG = `<svg class="star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26 6.9.6-5.2 4.52 1.55 6.74L12 17.77l-6.15 3.35L7.4 14.38 2.2 9.86l6.9-.6L12 2z"/></svg>`

function head(ctx) {
  const { site, page } = ctx
  const canonical = page.canonical || absoluteUrl(site.baseUrl, page.permalink)
  const ogTitle = page.ogTitle || page.title
  const ogDescription = page.ogDescription || page.description
  const ogImage = absoluteUrl(site.baseUrl, page.ogImage || site.ogImage)
  const documentTitle = page.documentTitle || `${page.title} — MailDev`

  return `    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>${esc(documentTitle)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <link rel="canonical" href="${esc(canonical)}" />
${page.noindex ? '    <meta name="robots" content="noindex" />\n' : ''}
    <meta property="og:type" content="${esc(ctx.ogType || 'website')}" />
    <meta property="og:site_name" content="MailDev" />
    <meta property="og:title" content="${esc(ogTitle)}" />
    <meta property="og:description" content="${esc(ogDescription)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:image" content="${esc(ogImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(ogTitle)}" />
    <meta name="twitter:description" content="${esc(ogDescription)}" />
    <meta name="twitter:image" content="${esc(ogImage)}" />

    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/icon.svg" />
${site.hasBlog === false ? '' : '    <link rel="alternate" type="application/rss+xml" title="MailDev blog" href="/blog/feed.xml" />\n'}
    <link rel="stylesheet" href="/assets/font/inter-3-15/inter-block.css" />
    <link rel="stylesheet" href="/assets/css/site.css" />
${ctx.jsonLd ? `\n    <script type="application/ld+json">\n${JSON.stringify(ctx.jsonLd, null, 2).replace(/^/gm, '      ')}\n    </script>\n` : ''}
    <script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());
      gtag("config", "${site.gaId}");
    </script>`
}

function header(site, page) {
  const links = site.headerNav
    .map((link) => {
      const active = page.permalink && link.href !== '/' && page.permalink.startsWith(link.href)
      return `          <a href="${esc(link.href)}"${link.hideSm ? ' class="hide-sm"' : ''}${active ? ' aria-current="true"' : ''}>${esc(link.label)}</a>`
    })
    .join('\n')

  return `    <header class="site-header">
      <div class="container nav">
        <a class="brand" href="/">
          ${BRAND_SVG}
          MailDev
        </a>
        <nav class="nav-links">
${links}
          <a class="star-pill" href="${esc(site.links.repo)}" aria-label="Star MailDev on GitHub">
            ${GITHUB_SVG}
            ${STAR_SVG}
            <span data-gh-stars>5,900+</span>
          </a>
        </nav>
      </div>
    </header>`
}

function footer(site) {
  const links = site.footerLinks
    .map((link) => `          <a href="${esc(link.href)}">${esc(link.label)}</a>`)
    .join('\n')

  return `    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <a class="brand" href="/" style="margin-bottom: 0.5rem">
            ${BRAND_SVG}
            MailDev
          </a>
          <p style="margin: 0">
            Open source email testing for developers. MIT licensed.
          </p>
        </div>
        <div class="footer-links">
${links}
        </div>
      </div>
    </footer>`
}

/**
 * Wrap a rendered body in the site chrome.
 * All internal URLs here are root-relative; build.mjs rewrites them to
 * depth-correct relative paths at emit time.
 */
export function base(ctx) {
  return `<!doctype html>
<!-- Generated by scripts/build.mjs from ${ctx.page.sourcePath || 'data/'} — edit the source, not this file. -->
<html lang="en">
  <head>
${head(ctx)}
  </head>
  <body${ctx.bodyClass ? ` class="${ctx.bodyClass}"` : ''}>
${header(ctx.site, ctx.page)}

${ctx.body}

${footer(ctx.site)}

    <script src="/assets/js/site.js" defer></script>
  </body>
</html>
`
}

export { BRAND_SVG }
