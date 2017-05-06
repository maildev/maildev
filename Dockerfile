FROM node:6-alpine
MAINTAINER "Dan Farrelly <daniel.j.farrelly@gmail.com>"

ENV NODE_ENV production

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD package.json /usr/src/app/

RUN npm install && npm prune && npm cache clean
RUN rm -rf /tmp/*

ADD index.js /usr/src/app
ADD app /usr/src/app/app
ADD assets /usr/src/app/assets
ADD bin /usr/src/app/bin
ADD lib /usr/src/app/lib

EXPOSE 80 25

CMD ["bin/maildev", "--web", "80", "--smtp", "25"]
