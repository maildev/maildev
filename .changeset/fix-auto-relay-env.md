---
'maildev': patch
---

Honor `MAILDEV_AUTO_RELAY` and `MAILDEV_AUTO_RELAY_RULES` so Docker and other
env-based setups can enable auto-relay the same way `--auto-relay` and
`--auto-relay-rules` do. `true`, `1`, and a present-but-empty value relay to
each mail's own recipients; `false` and `0` disable; any other value is the
override recipient.
