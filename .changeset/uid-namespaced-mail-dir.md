---
'maildev': patch
---

Namespace the CLI's default mail spool by user id so two accounts sharing `/tmp` on Linux no longer collide on `/tmp/maildev` (#290). `--mail-directory` / `MAILDEV_MAIL_DIRECTORY` is unchanged.
