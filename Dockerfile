# Base
FROM node:10-alpine as base
MAINTAINER "Dan Farrelly <daniel.j.farrelly@gmail.com>"

ENV NODE_ENV production

# Build
FROM base as build

WORKDIR /root
COPY package*.json ./

RUN npm install \
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

ENTRYPOINT ["/home/node/bin/maildev"]
CMD ["--web", "1080", "--smtp", "1025"]

HEALTHCHECK --interval=10s --timeout=1s \
  CMD wget -O - http://localhost:1080/healthz || exit 1