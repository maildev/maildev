# Base
FROM node:16-alpine as base
MAINTAINER "Dan Farrelly <daniel.j.farrelly@gmail.com>"
ENV NODE_ENV production


# Build
FROM base as build
WORKDIR /root
# In order to avoid installation errors,
# we prepare a separate lock file for Node v16
COPY package.json ./
COPY docker/package-lock.json ./
RUN npm install --production \
  && npm prune \
  && npm cache clean --force \
  && rm package*.json


# Prod
FROM base as prod
USER node
WORKDIR /home/node
COPY --chown=node:node . /home/node
COPY --chown=node:node --from=build /root/node_modules /home/node/node_modules
EXPOSE 1080 1025
ENV MAILDEV_WEB_PORT 1080
ENV MAILDEV_SMTP_PORT 1025
ENTRYPOINT ["bin/maildev"]
HEALTHCHECK --interval=10s --timeout=1s \
  CMD wget -O - http://localhost:${MAILDEV_WEB_PORT}/healthz || exit 1
