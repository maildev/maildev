FROM node:12-alpine
MAINTAINER "Dan Farrelly <daniel.j.farrelly@gmail.com>"

ENV NODE_ENV production

RUN apk add --no-cache curl

USER node

WORKDIR /home/node

ADD . /home/node

RUN npm install && \
    npm prune && \
    npm cache clean --force && \
    rm -rf /tmp/*

EXPOSE 1080 1025

ENTRYPOINT ["/home/node/bin/maildev"]
CMD ["--web", "1080", "--smtp", "1025"]

HEALTHCHECK --interval=10s --timeout=1s \
  CMD curl -k -f -v http://localhost:1080/healthz || exit 1
