FROM node:5-slim

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD package.json /usr/src/app/
RUN npm install
ADD . /usr/src/app

EXPOSE 80 25

CMD ["bin/maildev", "--web", "80", "--smtp", "25"]
