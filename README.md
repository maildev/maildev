# MailDev website

Source for the MailDev site published at <https://maildev.github.io/maildev/> via
GitHub Pages (this `gh-pages` branch).

The landing page and the documentation are generated from `content/` by
`scripts/build.mjs`, and **the generated HTML is committed**. GitHub Pages serves
this branch directly, so pushing is deploying and the build must never be a
deploy-time dependency.

> [!IMPORTANT]
> Do not edit the generated `.html` files — the next `make build` overwrites
> them. Edit the markdown in `content/` instead. See [Source vs generated](#source-vs-generated).

## Run it locally

```bash
make dev            # build, watch content/, and serve on http://localhost:8000
make serve          # build once and serve
make open           # ...and open a browser
make serve PORT=8080
```

`make help` lists every target. The preview server mirrors GitHub Pages — clean
directory URLs like `/docs/install/` resolve to `index.html` — and sends
`Cache-Control: no-store`, so edits show up on a plain reload.

Building needs Node.js 20+ and one `npm install`. Serving needs only Python 3.

## Editing content

| To change… | Edit |
| --- | --- |
| A docs page | `content/docs/<section>/<page>.md` |
| The landing page | `content/home.html` (body markup) |
| A blog post | `content/blog/YYYY-MM-DD-slug.md` |
| Sidebar order, sections, redirects | `data/nav.json` |
| Site metadata, header/footer links | `data/site.json` |
| Page chrome (head, nav, footer) | `layouts/base.mjs` |
| The `llms.txt` preamble | `content/llms-intro.md` |

Then:

```bash
make build
git add -A && git commit
```

### Adding a docs page

1. Create `content/docs/<section>/<slug>.md` with front matter:

   ```yaml
   ---
   title: Page title
   description: One sentence. Used for the meta description, the sidebar tooltip, and llms.txt.
   ---
   ```

2. Add its id (`docs/<section>/<slug>`) to the right section in `data/nav.json`.
   The build **fails** if a page is missing from the manifest — that is
   deliberate, since a page absent from the sidebar is invisible.
3. `make build`.

Optional front matter: `permalink` (defaults to `/docs/<section>/<slug>/`),
`ogTitle`, `ogDescription`, `ogImage`, `sidebarLabel`, `toc: false`, `noindex`,
`aliases` (each generates a redirect stub), `updated`,
`sourceUrl` (marks a page as vendored). Unknown keys are a build error, which
catches typos like `desciption:` that would otherwise ship an empty description.

### Adding a blog post

```bash
make new-post SLUG=my-post DATE=2026-09-01
```

Posts are `draft: true` by default and excluded from the output, the sitemap, and
the feed until you flip it. `make drafts` builds them and serves the result — do
not commit that build; run `make build` again before committing.

With **no** published posts, `/blog/`, the RSS feed, and the Blog links in the
header and footer are not emitted at all, rather than shipping an empty index
that every page links to. They come back on their own as soon as a post stops
being a draft.

## Authoring conventions

- **Links are root-relative**: `[install](/docs/install/)`, `/assets/img/x.png`.
  The build rewrites them to depth-correct relative paths at emit time, which is
  why the site works both at `/maildev/` in production and at `/` under
  `make serve`. Never hand-count `../`.
- **Shell commands go in ` ```console ` fences, with no `$` prefix.** The prompt
  is rendered in CSS, so the copy button copies a runnable command.
- **Everything else gets a real language tag** (` ```ts `, ` ```python `,
  ` ```ini `) and is syntax-highlighted at build time by Shiki. No client-side
  highlighting.
- **Callouts** use containers:

  ```markdown
  :::note
  Worth knowing.
  :::

  :::warn
  Read this before you deploy it.
  :::

  :::tip
  A shortcut.
  :::
  ```

- **Tables** are styled as comparison tables automatically; cells reading `Yes`
  or `No` are colored.

## Source vs generated

Generated, listed in `build.manifest.json` — never edit:

`index.html` · `docs/**` · `blog/**` · `setup/` `mcp/` `vs/mailcatcher/`
(redirect stubs) · `index.md` `setup.md` `mcp.md` `vs-mailcatcher.md` (one-line
pointers at previously published URLs) · `404.html` · `sitemap.xml` ·
`robots.txt` · `llms.txt` · `llms-full.txt` · `assets/js/site.js`

Source, hand-maintained:

`content/` · `data/` · `layouts/` · `scripts/` · `assets/css/site.css` ·
`assets/font/` · `assets/img/` · `assets/og/og.html` · `icon.svg` · `favicon.ico`

The build refuses to write to any source path, and removes files it previously
generated but no longer produces. `make clean` deletes exactly the manifest set.

## Where the docs come from

This site is canonical for narrative documentation — getting started, guides,
integrations, comparisons, and the AI pages.

The [maildev repo](https://github.com/maildev/maildev) stays canonical for
reference that has to track the code. Those pages are **vendored**, not rewritten:

```bash
make sync-docs      # re-copy from ../maildev/docs into content/docs/reference/
```

| Site page | Upstream source |
| --- | --- |
| `/docs/reference/rest-api/` | `docs/rest.md` |
| `/docs/reference/node-api/` | `docs/api.md` |

Vendored files carry the upstream revision and a content hash in a comment. Edit
them upstream and re-sync; never edit them here.

## Notes

- **Agent/LLM consumption is via `llms.txt` and `llms-full.txt`.** Per-page
  markdown twins (`docs/install.md` beside `docs/install/index.html`) were
  emitted at one point and have been retired — they duplicated the source
  almost verbatim. `llms-full.txt` carries every page's markdown in navigation
  order. The four `.md` URLs published before that change (`index.md`,
  `setup.md`, `mcp.md`, `vs-mailcatcher.md`) remain as one-line pointers so
  they do not 404.
- **`.nojekyll` must stay.** Without it GitHub Pages runs Jekyll over this
  branch, which converts the markdown under `content/` and can fail the build
  outright if a code fence contains Liquid syntax (`{{`, `{%`).
- Regenerate screenshots by running MailDev locally and re-capturing the UI. Docs
  screenshots live in `assets/img/docs/`; a figure whose asset does not exist yet
  renders as a visible dashed placeholder (search for `figure-todo`).
- The social card (`assets/img/og.png`) is rendered from `assets/og/og.html`:

  ```bash
  make og
  ```

- Known gaps and deferred ideas are logged in [DOCS_ROADMAP.md](DOCS_ROADMAP.md).
- `.github/workflows/site.yml` only *verifies* that committed output matches the
  generator. It does not deploy — Pages is configured to serve this branch
  directly, and that setting must not change to "GitHub Actions".
