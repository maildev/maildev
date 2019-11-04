FROM node:8-alpine
MAINTAINER "Dan Farrelly <daniel.j.farrelly@gmail.com>"

ENV NODE_ENV production

RUN apk add --no-cache curl

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD package*.json /usr/src/app/

RUN npm install && \
    npm prune && \
    npm cache clean --force && \
    rm -rf /tmp/*

ADD . /usr/src/app/

EXPOSE 1080 1025

ENTRYPOINT ["bin/maildev"]
CMD ["--web", "1080", "--smtp", "1025"]

HEALTHCHECK --interval=10s --timeout=1s \
  CMD curl -k -f -v http://localhost/healthz || exit 1
