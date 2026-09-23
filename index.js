/**
 * MailDev - index.js
 *
 * Author: Dan Farrelly <daniel.j.farrelly@gmail.com>
 * Licensed under the MIT License.
 */

const program = require('commander').program
const async = require('async')
const pkg = require('./package.json')
const web = require('./lib/web')
const mailserver = require('./lib/mailserver')
const logger = require('./lib/logger')
const { options, appendOptions } = require('./lib/options')

// TODO(v2.3.0): confirm this URL once the 3.0 announcement post is published on the site
const NOTICE_3_0_URL = 'https://maildev.github.io/maildev/blog/maildev-3-0/'
const NOTICE_3_0 = 'MailDev 3.0 is out — new inbox UI, persistent mail storage, and an MCP server so coding agents can read your dev inbox. Announcement: ' + NOTICE_3_0_URL

module.exports = function (config) {
  const version = pkg.version
  const isCli = !config

  if (isCli) {
    // CLI
    config = appendOptions(program.version(version).allowUnknownOption(true), options)
      .parse(process.argv)
      .opts()
  }

  if (config.verbose) {
    logger.setLevel(2)
  } else if (config.silent) {
    logger.setLevel(0)
  }

  // Start the Mailserver
  mailserver.create(
    config.smtp,
    config.ip,
    config.mailDirectory,
    config.incomingUser,
    config.incomingPass,
    config.hideExtensions,
    config.incomingSecure,
    config.incomingCert,
    config.incomingKey
  )

  if (
    config.outgoingHost ||
    config.outgoingPort ||
    config.outgoingUser ||
    config.outgoingPass ||
    config.outgoingSecure
  ) {
    mailserver.setupOutgoing(
      config.outgoingHost,
      parseInt(config.outgoingPort),
      config.outgoingUser,
      config.outgoingPass,
      config.outgoingSecure
    )
  }

  if (config.autoRelay) {
    const emailAddress = typeof config.autoRelay === 'string' ? config.autoRelay : null
    mailserver.setAutoRelayMode(true, config.autoRelayRules, emailAddress)
  }

  if (config.mailDirectory) {
    mailserver.loadMailsFromDirectory()
  }

  // Start the web server
  if (!config.disableWeb) {
    const secure = {
      https: config.https,
      cert: config.httpsCert,
      key: config.httpsKey
    }

    // Default to run on same IP as smtp
    const webIp = config.webIp ? config.webIp : config.ip

    web.start(
      config.web,
      webIp,
      mailserver,
      config.webUser,
      config.webPass,
      config.basePathname,
      secure
    )

    // Close the web server when the mailserver closes
    mailserver.on('close', web.close)
  }

  if (config.logMailContents) {
    mailserver.on('new', function (mail) {
      const mailContents = JSON.stringify(mail, null, 2)
      logger.info(`Received the following mail contents:\n${mailContents}`)
    })
  }

  function shutdown () {
    logger.info('Received shutdown signal, shutting down now...')
    async.parallel([
      mailserver.close,
      web.close
    ], function () {
      process.exit(0)
    })
  }

  // CLI only: bin/maildev calls this once the servers are up, so the notice
  // appears after the startup lines. Library consumers (config passed in)
  // never see it.
  if (isCli) {
    mailserver.showUpdateNotice = function () {
      if (config.updateNotice && !process.env.MAILDEV_NO_UPDATE_NOTICE) {
        logger.info(NOTICE_3_0)
      }
    }
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return mailserver
}
