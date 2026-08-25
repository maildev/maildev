# MailDev website. Markdown in content/ is generated to static HTML that is
# committed to this branch — push is deploy. See README.md.

PORT ?= 8000
SLUG ?= new-post

.DEFAULT_GOAL := serve
.PHONY: serve open build dev check clean og sync-docs new-post help

## build: regenerate the site from content/ (writes HTML you must commit)
build:
	@node scripts/build.mjs

## serve: build, then preview the site on localhost (override with PORT=8080)
serve: build
	@python3 scripts/serve.py $(PORT)

## open: same as serve, but open a browser too
open: build
	@python3 scripts/serve.py $(PORT) --open

## dev: rebuild on every change while serving
dev: build
	@node scripts/build.mjs --watch & \
	  WATCHER=$$!; \
	  trap "kill $$WATCHER 2>/dev/null" EXIT INT TERM; \
	  python3 scripts/serve.py $(PORT)

## drafts: build including draft posts, then serve (never commit this output)
drafts:
	@node scripts/build.mjs --drafts
	@python3 scripts/serve.py $(PORT)

## check: fail if the committed output is stale or the content is invalid
check:
	@node scripts/build.mjs --check

## clean: remove every generated file (per build.manifest.json)
clean:
	@node scripts/build.mjs --clean

## sync-docs: re-vendor the reference docs from the maildev repo's main branch
sync-docs:
	@node scripts/sync-docs.mjs

## new-post: scaffold a blog post — make new-post SLUG=my-post
new-post:
	@test -n "$(DATE)" || { echo "Usage: make new-post SLUG=my-post DATE=YYYY-MM-DD"; exit 1; }
	@test ! -f content/blog/$(DATE)-$(SLUG).md || { echo "content/blog/$(DATE)-$(SLUG).md already exists"; exit 1; }
	@printf -- '---\ntitle: Title here\ndescription: One sentence, used for the meta description and the blog index.\ndate: %s\nauthor: MailDev\ntags:\n  - release\ndraft: true\n---\n\nWrite the post here.\n' "$(DATE)" > content/blog/$(DATE)-$(SLUG).md
	@echo "Created content/blog/$(DATE)-$(SLUG).md"

## og: re-render the social card from assets/og/og.html
og:
	npx playwright screenshot --viewport-size=1200,630 assets/og/og.html assets/img/og.png

## help: list available targets
help:
	@grep -E "^## " $(MAKEFILE_LIST) | sed "s/^## /  make /"
