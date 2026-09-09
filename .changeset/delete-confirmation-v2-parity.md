---
'@maildev/ui': patch
---

Restore v2's lighter-weight email deletion UX. "Delete all emails" no longer
opens a blocking confirmation dialog — the first click arms the button (it turns
red and slides open to "Confirm") and a second click within 2 seconds clears the
inbox, otherwise it resets. Deleting a single email now happens immediately on
click without a prompt, matching v2. Clearing the inbox also resets the reading
pane so a deleted email no longer lingers on screen.
