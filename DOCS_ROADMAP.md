# Website roadmap

Everything considered but not built while the docs section was set up, so the
context isn't lost. Not a commitment — a list of known gaps and ideas, roughly
in the order they'd pay off.

Scope is this branch only (the website). Application roadmaps live on `main`.

## Content

The docs shipped with 17 pages. These were scoped and deliberately deferred.

### Integration guides

Same shape as the existing [Nodemailer](content/docs/integrations/nodemailer.md)
page: config snippet, environment-driven variant, framework-specific gotcha,
testing note, troubleshooting.

| Guide | Notes |
| --- | --- |
| Symfony Mailer | `MAILER_DSN=smtp://127.0.0.1:1025`. Underpins Laravel too, so partly written already |
| Spring Boot / Java | Was on the old `/setup/` page; the properties block survives in the quick start but has no page |
| .NET / ASP.NET Core | MailKit and `System.Net.Mail` |
| Go | `net/smtp`, plus `gomail` |
| Python (non-Django) | `smtplib`, Flask-Mail. The raw `smtplib` snippet is already in the quick start |
| NestJS | `@nestjs-modules/mailer` |
| Next.js | Route handlers plus React Email; overlaps the Nodemailer page |
| Auth.js / NextAuth | Email provider, magic links. High intent — verification mail is the main reason people reach for a catcher |
| Better Auth | Same shape as Auth.js |
| Supabase | Local dev stack SMTP settings |
| Keycloak | Realm SMTP config |
| WordPress | WP Mail SMTP plugin |
| Strapi | Nodemailer provider |

### Guides

| Guide | Why it matters |
| --- | --- |
| Authentication | `--web-user`/`--web-pass` and `--incoming-user`/`--incoming-pass`. Currently only in the CLI reference table; there's no prose anywhere, including upstream |
| Relay & auto-relay | A real feature with allow/deny rule files and a genuine footgun (it sends real mail). Documented only as a CLI table row |
| Storage & persistence | `--mail-directory`, `--max-emails`, eviction, restore-on-startup |
| Reverse proxy | `--base-pathname` behind nginx/Traefik/Caddy. The websocket upgrade headers are the part people get wrong; there's a partial nginx example in the HTTPS guide |
| Email template development | React Email, MJML, Handlebars — the iterate-and-preview loop. Partly covered in the Nodemailer page |
| Upgrading v2 → v3 | Node 20+, ESM-only, callbacks → promises. Scattered across the install page and the release post |
| Troubleshooting / FAQ | Each page has its own troubleshooting section; a single cross-cutting page would catch searches those don't |

### Comparisons

Only `vs Mailcatcher` shipped (ported from the old page).

- **vs Mailpit** and **vs MailHog** — the two highest-value pages on this whole list. MailHog is archived but still carries heavy search volume; Mailpit is its active successor and the tool people actually evaluate MailDev against.
- **vs Mailtrap** — the hosted option; a different trade-off (real inboxes, team sharing, paid).
- **vs smtp4dev / Papercut** — the .NET-ecosystem tools.
- **"How to test emails locally"** — a pillar page the comparisons and integrations link up into, rather than another head-to-head.

### AI & agents

- **Cursor**, **Codex**, **Windsurf** walkthroughs. The MCP page covers config for all of them; these would be step-by-step like the Claude Code page.
- **Recipes** — agent-driven signup/reset/invite verification as a short cookbook.

### Blog

The 3.0 release post is written but held as a draft
(`content/blog/2026-08-25-maildev-3-0.md`, `draft: true`), so the blog section
is not currently emitted. Publishing is a one-line change: drop `draft: true`
and rebuild — `/blog/`, the feed, and the nav links all reappear.

Nothing else is planned; the generator is ready when there is something to say.

## Assets

- **Claude Code walkthrough figures.** Four slots render as visible dashed
  placeholders — search `figure-todo`. Three screenshots and one screen
  recording, filenames and captions already specified in
  `content/docs/ai/claude-code.md`. Drop the captures into
  `assets/img/docs/` and replace the placeholder blocks.
- **Per-page OG images.** `ogImage:` front matter is supported and works, but
  only the one default card (`assets/img/og.png`) exists. Section-level cards
  would improve link previews; `assets/og/og.html` plus `make og` is the
  template to fork.
- **Screenshot freshness.** The five UI screenshots are 3.0-rc captures. They'll
  need retaking when the UI moves.

## Decisions already made

- **Per-page markdown mirrors were retired.** Each docs page used to emit a
  `.md` twin next to its HTML (advertised via `<link rel="alternate">`), which
  reproduced the source almost verbatim and read as duplication in the repo.
  Agents are served by `llms.txt` plus `llms-full.txt` instead. Reinstating them
  would mean re-adding a `mirror` front-matter key and the emit step in
  `scripts/build.mjs`. The four `.md` URLs published before the change are kept
  as one-line pointers.

## Site features

- **Search.** The obvious next ask once the page count passes ~30. The build
  already holds every page's plain text, so emitting `search-index.json` plus a
  small client-side filter is purely additive. Pagefind was considered and
  rejected: it ships a WASM binary and index shards that would have to be
  committed to this branch.
- **Blog tags.** `tags:` is accepted in post front matter and validated, but
  nothing renders it and there are no tag archive pages. Currently inert.
- **Blog pagination.** The index lists every post. Fine at one post; revisit
  past ~20.
- **"Last updated" dates.** `updated:` front matter renders when present, but no
  page sets it. Deriving it from git mtime was rejected — it is nondeterministic
  across clones and would dirty the diff on every rebuild. Setting it by hand is
  the only honest option, and it goes stale silently.
- **Sitemap `lastmod`.** Omitted for the same reason.

## Upstream / cross-repo

- **Slim `main`'s `docs/{mcp,docker,https}.md` to pointers.** Their prose now
  lives on the site and will rot in two places. `docs/rest.md` and `docs/api.md`
  stay canonical upstream and are vendored in via `make sync-docs` — see the
  README.
- **`main/docs/docker.md` is stale** independently of this: it still shows a
  `bin/maildev` invocation that predates the current
  `ENTRYPOINT ["node", "dist/bin/maildev.js"]`, has an empty "Advanced usage —
  _Needs documentation_" stub, and documents neither the `HEALTHCHECK` nor
  `USER node`. The site's Docker guide covers all of it.
- **`main`'s README flag table documents environment variables that don't
  exist in 3.0**: `MAILDEV_AUTO_RELAY`, `MAILDEV_AUTO_RELAY_RULES`,
  `MAILDEV_HIDE_EXTENSIONS`, `MAILDEV_LOG_MAIL_CONTENTS`. None are read in
  `packages/cli/src/config/env.ts`. The site's CLI reference documents the real
  behavior and calls the gap out.
- **Open issues filed from this work:**
  [#567](https://github.com/maildev/maildev/issues/567) (`smtp: 0` ignored, bound
  port not exposed) and
  [#568](https://github.com/maildev/maildev/issues/568) (SMTP port conflict
  crashes the process instead of rejecting `start()`). Both limit using the
  programmatic API under a parallel test runner. If they're fixed, the
  "Or skip the container entirely" section of the CI guide is worth expanding
  into a full in-process testing guide.

## Infrastructure

- **Pages deploy source must stay "Deploy from a branch → gh-pages."**
  `.github/workflows/site.yml` only verifies that committed output matches the
  generator; it does not deploy. If the setting is ever switched to "GitHub
  Actions", the site goes dark until a deploy workflow exists.
- **Custom domain.** `data/site.json` has a documented `basePath` escape hatch
  for it, currently unused. Internal links are emitted relative, so a CNAME
  would not require rebuilding every page — only `baseUrl` changes, which
  affects canonicals, OG tags, the sitemap, and `llms.txt`.
- **Shiki is pinned exactly** (`3.13.0`, no caret). A minor bump can shift token
  boundaries and rewrite every code block in the repo. Treat an upgrade as its
  own commit.
- **No formatter runs over generated output** on purpose. The existing HTML was
  Prettier-formatted from `main`'s config; adding Prettier here would reformat
  everything in one enormous diff. If it's ever added, put the generated paths
  in `.prettierignore`.
