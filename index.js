
/**
 * MailDev - index.js
 *
 * Author: Dan Farrelly <daniel.j.farrelly@gmail.com>
 * Licensed under the MIT License.
 */

var program     = require('commander');
var pkg         = require('./package.json');
var web         = require('./lib/web');
var mailserver  = require('./lib/mailserver');
var logger      = require('./lib/logger');


module.exports = function(config) {
  
  var version = pkg.version;

  if (!config) {
    // CLI
    config = program
      .version(version)
      .option('-s, --smtp <port>', 'SMTP port to catch emails [1025]', '1025')
      .option('-w, --web <port>', 'Port to run the Web GUI [1080]', '1080')
      .option('--ip <ip address>', 'IP Address to bind services to', '0.0.0.0')
      .option('--outgoing-host <host>', 'SMTP host for outgoing emails')
      .option('--outgoing-port <port>', 'SMTP port for outgoing emails')
      .option('--outgoing-user <user>', 'SMTP user for outgoing emails')
      .option('--outgoing-pass <password>', 'SMTP password for outgoing emails')
      .option('--outgoing-secure', 'Use SMTP SSL for outgoing emails')
      .option('--auto-relay', 'Use auto-relay mode')
      .option('--auto-relay-rules <file>', 'Filter rules for auto relay mode')
      .option('--incoming-user <user>', 'SMTP user for incoming emails')
      .option('--incoming-pass <pass>', 'SMTP password for incoming emails')
      .option('--web-user <user>', 'HTTP user for GUI')
      .option('--web-pass <password>', 'HTTP password for GUI')
      .option('-o, --open', 'Open the Web GUI after startup')
      .option('-v, --verbose')
      .parse(process.argv);
  }

  if (config.verbose){
    logger.init(true);
  }
  
  // Start the Mailserver & Web GUI
  mailserver.create(config.smtp, config.ip, config.incomingUser, config.incomingPass);

  if (config.outgoingHost ||
      config.outgoingPort ||
      config.outgoingUser ||
      config.outgoingPass ||
      config.outgoingSecure) {

    mailserver.setupOutgoing(
      config.outgoingHost,
      parseInt(config.outgoingPort),
      config.outgoingUser,
      config.outgoingPass,
      config.outgoingSecure
    );
  }

  if (config.autoRelay){
    mailserver.setAutoRelayMode(true, config.autoRelayRules);
  }

  web.start(config.web, config.ip, mailserver, config.webUser, config.webPass);

  if (config.open){
    var open = require('open');
    open('http://' + (config.ip === '0.0.0.0' ? 'localhost' : config.ip) + ':' + config.web);
  }

  return mailserver;
};
