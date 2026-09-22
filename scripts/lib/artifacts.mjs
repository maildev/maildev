// Everything that used to be hand-maintained: sitemap.xml, llms.txt,
// llms-full.txt, robots.txt, the RSS feed, the per-page markdown mirrors, and
// the .md pointer files.
//
// All output is deterministic — no build timestamps, no mtimes, no
// history-derived dates — so rebuilding an unchanged tree produces an empty git
// diff. Sitemap <lastmod> comes only from `updated:` front matter, which is
// part of the committed content.

import { absolutize, absoluteUrl, esc, rfc822 } from './util.mjs'

function xmlEscape(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Flatten ::::tabs / :::tab container syntax (see scripts/lib/markdown.mjs)
 * into plain markdown for the agent-facing mirrors — per-page .md twins and
 * llms-full.txt — where a custom container would be noise. Each pane becomes a
 * bold label followed by its content. Fence-aware, so a `:::` inside a code
 * block cannot terminate a pane.
 */
export function expandTabsForMirror(markdown) {
  const out = []
  let inTabs = false
  let fence = null

  for (const line of markdown.split('\n')) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fence) {
      out.push(line)
      const close = line.trim()
      if (close.length >= fence.length && close[0] === fence[0] && /^[`~]+$/.test(close)) {
        fence = null
      }
      continue
    }
    if (fenceMatch) {
      fence = fenceMatch[1]
      out.push(line)
      continue
    }
    if (/^:{4,}tabs(?:\s|$)/.test(line)) {
      inTabs = true
      continue
    }
    if (inTabs && /^:{4,}$/.test(line)) {
      inTabs = false
      continue
    }
    if (inTabs && /^::+tab(?:\s|$)/.test(line)) {
      const label = line.replace(/^::+tab\s*/, '').trim()
      if (label) out.push('', `**${label}**`, '')
      continue
    }
    if (inTabs && /^::+$/.test(line)) continue
    out.push(line)
  }

  return out.join('\n')
}

export function sitemap({ site, docs, posts, lastmods }) {
  const entries = [
    { loc: '/', priority: '1.0' },
    { loc: '/docs/', priority: '0.9' },
    ...docs.filter((doc) => doc.permalink !== '/docs/' && !doc.noindex)
      .map((doc) => ({ loc: doc.permalink, priority: '0.8' })),
    ...(posts.length ? [{ loc: '/blog/', priority: '0.5' }] : []),
    ...posts.filter((post) => !post.noindex).map((post) => ({ loc: post.permalink, priority: '0.6' })),
    ...(site.staticUrls || []).map((loc) => ({ loc, priority: '0.5' })),
  ]

  // Pages without an `updated` date simply omit <lastmod>; fabricating one
  // from build time would train crawlers to distrust the value.
  const urls = entries
    .map((entry) => {
      const lastmod = lastmods?.get(entry.loc)
      return [
        '  <url>',
        `    <loc>${xmlEscape(absoluteUrl(site.baseUrl, entry.loc))}</loc>`,
        ...(lastmod ? [`    <lastmod>${xmlEscape(lastmod)}</lastmod>`] : []),
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
${urls}
</urlset>
`.replace('www.sitemap.org', 'www.sitemaps.org')
}

export function robots(site) {
  return `User-agent: *
Allow: /

# Generator sources are deployed alongside the output; they are not pages.
Disallow: /content/
Disallow: /layouts/
Disallow: /data/
Disallow: /scripts/

Sitemap: ${site.baseUrl}/sitemap.xml
`
}

/** llms.txt — a curated preamble plus a generated page index. */
export function llms({ site, intro, sections, posts }) {
  const groups = sections
    .map((section) => {
      const items = section.items
        .map(
          (doc) =>
            `- [${doc.title}](${absoluteUrl(site.baseUrl, doc.permalink)}): ${doc.description}`,
        )
        .join('\n')
      return `## ${section.title}\n${items}`
    })
    .join('\n\n')

  const blog = posts.length
    ? `\n\n## Blog\n${posts
        .map(
          (post) =>
            `- [${post.title}](${absoluteUrl(site.baseUrl, post.permalink)}) (${post.date}): ${post.description}`,
        )
        .join('\n')}`
    : ''

  return `${intro.trim()}

## Pages
- [Home](${site.baseUrl}/): Overview, features, and quickstart.
- [Documentation index](${site.baseUrl}/docs/): Every guide, integration, and reference page.

${groups}${blog}

## Markdown mirrors
Every documentation page above is also published as plain markdown at the same
path with the trailing slash replaced by \`.md\` — for example
[docs/quickstart.md](${site.baseUrl}/docs/quickstart.md). Prefer a mirror when
fetching a single page; llms-full.txt concatenates every page for one-shot reads.

## Full text
- [llms-full.txt](${site.baseUrl}/llms-full.txt): Every documentation page concatenated as plain markdown.
`
}

/** llms-full.txt — every docs page's markdown in sidebar order. */
export function llmsFull({ site, sections }) {
  const body = sections
    .flatMap((section) =>
      section.items.map(
        (doc) => `# ${doc.title}
Source: ${absoluteUrl(site.baseUrl, doc.permalink)}
Section: ${section.title}

${doc.description}

${absolutize(expandTabsForMirror(doc.markdown.trim()), site.baseUrl)}`,
      ),
    )
    .join('\n\n---\n\n')

  return `# MailDev documentation — full text

Every documentation page from ${site.baseUrl}/docs/, concatenated in navigation
order. Generated; do not edit. Each page is also published individually at its
URL with the trailing slash replaced by \`.md\`.

---

${body}
`
}

/**
 * One docs page as standalone plain markdown — the per-page twin of the
 * llms-full.txt blocks above. Links are absolutized so the file makes sense
 * fetched in isolation. Same URL as the HTML page with the trailing slash
 * replaced by `.md`.
 */
export function docMirror({ site, doc }) {
  const section = doc.section ? `\nSection: ${doc.section.title}` : ''
  return `# ${doc.title}
Source: ${absoluteUrl(site.baseUrl, doc.permalink)}${section}

${doc.description}

${absolutize(expandTabsForMirror(doc.markdown.trim()), site.baseUrl)}
`
}

export function mirrorRedirect({ site, to }) {
  return `Moved to ${absoluteUrl(site.baseUrl, to)}
`
}

export function feed({ site, posts }) {
  const items = posts
    .map(
      (post) => `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${xmlEscape(absoluteUrl(site.baseUrl, post.permalink))}</link>
      <guid isPermaLink="true">${xmlEscape(absoluteUrl(site.baseUrl, post.permalink))}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <description>${xmlEscape(post.excerpt || post.description)}</description>
      <content:encoded><![CDATA[${absolutize(post.html, site.baseUrl)}]]></content:encoded>
    </item>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MailDev blog</title>
    <link>${site.baseUrl}/blog/</link>
    <atom:link href="${site.baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Releases, guides, and notes from the MailDev project.</description>
    <language>en</language>
${posts.length ? `    <pubDate>${rfc822(posts[0].date)}</pubDate>\n` : ''}${items}
  </channel>
</rss>
`
}

/** The shared client script: copy buttons, star count, TOC scroll-spy. */
export function siteJs() {
  return `/* Generated by scripts/build.mjs — edit scripts/lib/artifacts.mjs, not this file. */
(function () {
  "use strict";

  // Lets CSS tell JS-apart-from-no-JS apart (tab bars are useless without it).
  document.documentElement.classList.add("js");

  // ---- Copy button on every code block -------------------------------------
  var COPY_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

  document.querySelectorAll("pre").forEach(function (pre) {
    if (pre.parentElement && pre.parentElement.classList.contains("pre-wrap")) return;
    var wrap = document.createElement("div");
    wrap.className = "pre-wrap";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.setAttribute("data-copy", pre.textContent.replace(/\\n$/, ""));
    btn.innerHTML = COPY_ICON + '<span class="copy-btn-label">Copy</span>';
    wrap.appendChild(btn);
  });

  document.addEventListener("click", function (event) {
    var btn = event.target.closest ? event.target.closest("[data-copy]") : null;
    if (!btn) return;
    var text = btn.getAttribute("data-copy");
    var done = function () {
      var label = btn.querySelector(".copy-btn-label");
      if (label) label.textContent = "Copied";
      btn.classList.add("copied");
      setTimeout(function () {
        if (label) label.textContent = "Copy";
        btn.classList.remove("copied");
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
      return;
    }
    var area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (e) {}
    document.body.removeChild(area);
  });

  // ---- Tabbed code groups ---------------------------------------------------
  // The static HTML ships every pane visible; here we hide the inactive ones,
  // switch every group sharing a data-sync key together, and persist the
  // choice so it follows the reader across pages. Groups without a key are
  // independent. Static markup follows the WAI-ARIA tabs pattern.
  (function () {
    var groups = Array.prototype.slice.call(document.querySelectorAll(".code-tabs"));
    if (!groups.length) return;

    var read = function (key) {
      if (!key) return null;
      try { return localStorage.getItem("maildev.tabs." + key); } catch (e) { return null; }
    };
    var write = function (key, label) {
      if (!key) return;
      try { localStorage.setItem("maildev.tabs." + key, label); } catch (e) {}
    };

    var tabsOf = function (group) {
      return Array.prototype.slice.call(group.querySelectorAll("[role='tab']"));
    };

    // Activate the pane matching "label" in one group; false if absent, which
    // is how a synced group falls back when it lacks the shared selection.
    var show = function (group, label) {
      var tabs = tabsOf(group);
      var panes = Array.prototype.slice.call(group.querySelectorAll("[role='tabpanel']"));
      var index = -1;
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].textContent === label) { index = i; break; }
      }
      if (index < 0) return false;
      tabs.forEach(function (tab, i) {
        tab.setAttribute("aria-selected", i === index ? "true" : "false");
        tab.tabIndex = i === index ? 0 : -1;
      });
      panes.forEach(function (pane, i) {
        if (i === index) pane.removeAttribute("hidden");
        else pane.setAttribute("hidden", "");
      });
      return true;
    };

    var select = function (tab) {
      var group = tab.closest(".code-tabs");
      if (!group) return;
      var label = tab.textContent;
      var key = group.getAttribute("data-sync");
      show(group, label);
      if (key) {
        write(key, label);
        groups.forEach(function (other) {
          if (other !== group && other.getAttribute("data-sync") === key) show(other, label);
        });
      }
    };

    groups.forEach(function (group) {
      group.classList.add("code-tabs-live");
      var tabs = tabsOf(group);
      if (!tabs.length) return;

      var saved = read(group.getAttribute("data-sync"));
      var initial = tabs[0].textContent;
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].textContent === saved) { initial = saved; break; }
      }
      show(group, initial);

      group.addEventListener("click", function (event) {
        var tab = event.target.closest ? event.target.closest("[role='tab']") : null;
        if (tab && group.contains(tab)) select(tab);
      });
      group.addEventListener("keydown", function (event) {
        var tab = event.target.closest ? event.target.closest("[role='tab']") : null;
        if (!tab) return;
        var index = tabs.indexOf(tab);
        var next = null;
        if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
        else if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
        else if (event.key === "Home") next = tabs[0];
        else if (event.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        next.focus();
        select(next);
      });
    });
  })();

  // ---- Live GitHub star count (6h cache) -----------------------------------
  (function () {
    var els = document.querySelectorAll("[data-gh-stars]");
    if (!els.length) return;
    function set(n) {
      var t = n.toLocaleString("en-US");
      els.forEach(function (e) {
        e.textContent = t;
      });
    }
    try {
      var cached = JSON.parse(localStorage.getItem("maildev-gh-stars") || "null");
      if (cached && typeof cached.n === "number" && Date.now() - cached.ts < 21600000) {
        set(cached.n);
        return;
      }
    } catch (e) {}
    fetch("https://api.github.com/repos/maildev/maildev")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        if (d && typeof d.stargazers_count === "number") {
          set(d.stargazers_count);
          try {
            localStorage.setItem(
              "maildev-gh-stars",
              JSON.stringify({ n: d.stargazers_count, ts: Date.now() })
            );
          } catch (e) {}
        }
      })
      .catch(function () {});
  })();

  // ---- Docs: TOC scroll-spy + reveal the active sidebar item ---------------
  var toc = document.querySelector(".docs-toc");
  if (toc && "IntersectionObserver" in window) {
    var links = {};
    toc.querySelectorAll("a[href^='#']").forEach(function (a) {
      links[decodeURIComponent(a.getAttribute("href").slice(1))] = a;
    });
    var headings = Object.keys(links)
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);

    var visible = new Set();
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });
        var first = headings.find(function (h) {
          return visible.has(h.id);
        });
        Object.keys(links).forEach(function (id) {
          if (first && id === first.id) links[id].setAttribute("aria-current", "true");
          else links[id].removeAttribute("aria-current");
        });
      },
      { rootMargin: "-72px 0px -70% 0px" }
    );
    headings.forEach(function (h) {
      observer.observe(h);
    });
  }

  var active = document.querySelector(".docs-nav a[aria-current='page']");
  if (active) {
    var rail = document.querySelector(".docs-sidebar");
    if (rail && rail.scrollHeight > rail.clientHeight) {
      var offset = active.offsetTop - rail.clientHeight / 2;
      if (offset > 0) rail.scrollTop = offset;
    }
  }
})();
`
}
