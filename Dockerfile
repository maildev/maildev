# Base
FROM node:10-alpine as base
LABEL org.opencontainers.image.authors="Dan Farrelly <daniel.j.farrelly@gmail.com>"

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

RUN apk update \
  && apk add dumb-init \
  && apk add dovecot dovecot-submissiond \
  && apk add sudo

# Avoid using encryption for docker setup.
RUN rm -f /etc/dovecot/conf.d/10-ssl.conf

# Add custom configuration file for submission (SMTP)
# with dovecot using the same username and password as
# for imap. This will forward to maildev.
COPY dovecot/20-submission.conf /etc/dovecot/conf.d/20-submission.conf
COPY dovecot/11-custom-logging.conf /etc/dovecot/conf.d/11-custom-logging.conf
COPY dovecot/11-custom-auth.conf /etc/dovecot/conf.d/11-custom-auth.conf
# Add a hardcoded list of users with passwords for smtp and imap auth.
COPY dovecot/users /etc/dovecot/users

COPY --chown=node:node . /home/node
COPY --chown=node:node --from=build /root/node_modules /home/node/node_modules

# Initialize the Maildir directory with the required folders
# for Dovecot to recognize it as a valid Maildir directory.
RUN mkdir /home/node/Maildir && \
  mkdir /home/node/Maildir/cur && \
  mkdir /home/node/Maildir/new && \
  mkdir /home/node/Maildir/tmp && \
  chown -R node /home/node/Maildir

EXPOSE 80 25 110 143 587

COPY run.sh /run.sh
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/bin/sh", "/run.sh"]

HEALTHCHECK --interval=10s --timeout=1s \
  CMD wget -O - http://localhost:80/healthz || exit 1
