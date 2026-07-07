# MailDev website

Source for the MailDev marketing site published at
<https://maildev.github.io/maildev/> via GitHub Pages (this `gh-pages` branch).

It's a static, no-build site — plain HTML and one hand-written stylesheet
(`assets/css/site.css`). Edit the `.html` files directly and push; there is no
compile step.

## Structure

- `index.html` — landing page
- `mcp/`, `setup/`, `vs/mailcatcher/` — guide pages
- `assets/css/site.css` — design tokens mirror the app (`packages/ui/src/index.css`)
- `assets/img/screenshots/` — 3.0 UI screenshots
- `*.md`, `llms.txt` — agent/LLM-readable copies of each page (for GEO)
- `sitemap.xml`, `robots.txt`, `icon.svg`, `assets/img/og.png` — SEO/social

## Notes

- Regenerate screenshots by running MailDev locally and re-capturing the UI.
- The social card (`assets/img/og.png`) is rendered from an HTML template at
  `assets/og/og.html`. Edit the copy/design there, then re-render:

  ```bash
  npx playwright screenshot --viewport-size=1200,630 \
    assets/og/og.html assets/img/og.png
  ```
