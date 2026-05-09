# Base
FROM node:22-alpine AS base
RUN apk add --no-cache tzdata
ENV NODE_ENV=production
ENV TZ=UTC

# UI build (Svelte + Vite)
FROM base AS ui-build
ENV NODE_ENV=development
WORKDIR /ui
COPY web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# Backend deps
FROM base AS build
WORKDIR /root
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts \
  && npm cache clean --force

# Prod
FROM base AS prod
USER node
WORKDIR /home/node
COPY --chown=node:node package*.json ./
COPY --chown=node:node index.js ./
COPY --chown=node:node bin/ ./bin/
COPY --chown=node:node lib/ ./lib/
COPY --chown=node:node vendor/ ./vendor/
COPY --chown=node:node README.md LICENSE ./
COPY --chown=node:node --from=ui-build /ui/dist /home/node/web/dist
COPY --chown=node:node --from=build /root/node_modules /home/node/node_modules
EXPOSE 1080 1025
ENV MAILDEV_WEB_PORT=1080
ENV MAILDEV_SMTP_PORT=1025
ENTRYPOINT ["bin/maildev"]
HEALTHCHECK --interval=10s --timeout=1s \
  CMD wget -O - http://localhost:${MAILDEV_WEB_PORT}${MAILDEV_BASE_PATHNAME}/healthz || exit 1
