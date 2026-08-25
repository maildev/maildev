# MailDev website — static, no build step. See README.md.

PORT ?= 8000

.DEFAULT_GOAL := serve
.PHONY: serve open og help

## serve: preview the site on localhost (override with PORT=8080)
serve:
	@python3 scripts/serve.py $(PORT)

## open: same as serve, but open a browser too
open:
	@python3 scripts/serve.py $(PORT) --open

## og: re-render the social card from assets/og/og.html
og:
	npx playwright screenshot --viewport-size=1200,630 assets/og/og.html assets/img/og.png

## help: list available targets
help:
	@grep -E "^## " $(MAKEFILE_LIST) | sed "s/^## /  make /"
