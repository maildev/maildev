---
'@maildev/api': patch
'maildev': patch
---

Fix HTTPS support in containerized MailDev by implementing HTTPS in the Fastify API server, threading HTTPS configuration through the CLI, and updating the Docker health check to detect HTTPS mode
