# Base
FROM node:16-alpine as base
MAINTAINER "Dan Farrelly <daniel.j.farrelly@gmail.com>"
ENV NODE_ENV production


# Build
FROM base as build
WORKDIR /root
COPY package*.json ./
# In order to ensure the normal operation of Node v12/v14,
# the current project uses the old version of npm lock
# TODO: Save node v16 dependency locks separately
RUN rm package-lock.json
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
  CMD wget -O - http://localhost:1080/healthz || exit 1