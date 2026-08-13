---
'maildev': patch
---

Restore persisted emails on startup. When `--mail-directory` (`MAILDEV_MAIL_DIRECTORY`) is set, existing `.eml` files in the directory are now loaded back into the UI when MailDev starts, so mail survives a restart (e.g. across container/pod restarts with a mounted volume).
