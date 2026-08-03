---
'@maildev/ui': patch
---

Make the top loading bar less disruptive and improve DOM testability.

- The loading bar shown during background refreshes is now kept mounted and toggled via opacity instead of being added to and removed from the DOM every poll cycle, so it no longer causes a reflow every few seconds. A new "Show loading bar" toggle in Settings lets you turn it off entirely.
- Added stable `data-testid` attributes to key elements (header actions, search input, email list and rows — including `data-email-id` — the email viewer, subject, attachments, and the loading bar) so automated UI tests no longer need to rely on fragile positional selectors.
