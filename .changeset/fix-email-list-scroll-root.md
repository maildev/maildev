---
'@maildev/ui': patch
---

Fix the email list stopping after 100 emails. The infinite-scroll sentinel was
observed against the viewport, so the sidebar's scroll container clipped it
before `rootMargin` could apply, and the zero-height sentinel never counted as
visible at the bottom of the list. It is now observed against its scroll
container.
