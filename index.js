
/**
 * MailDev - index.js
 *
 * Author: Dan Farrelly <daniel.j.farrelly@gmail.com>
 * Licensed under the MIT License.
 */

var program     = require('commander')
  , pkg         = require('./package.json')
  , web         = require('./lib/web')
  , mailserver  = require('./lib/mailserver')
  , logger      = require('./lib/logger')
  ;

module.exports = function(config) {
  
  var version = pkg.version;

  if (!config) {
    // CLI
    config = program
      .version(version)
      .option('-s, --smtp [port]', 'SMTP port to catch emails [1025]', '1025')
      .option('-w, --web [port]', 'Port to run the Web GUI [1080]', '1080')
      .option('--outgoing-host <host>', 'SMTP host for outgoing emails')
      .option('--outgoing-port <port>', 'SMTP port for outgoing emails')
      .option('--outgoing-user <user>', 'SMTP user for outgoing emails')
      .option('--outgoing-pass <pass>', 'SMTP password for outgoing emails')
      .option('--outgoing-secure', 'Use SMTP SSL for outgoing emails')
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
  mailserver.listen( config.smtp );
  if (
      config.outgoingHost ||
      config.outgoingPort ||
      config.outgoingUser ||
      config.outgoingPass ||
      config.outgoingSecure
      ){
    mailserver.setupOutgoing(
        config.outgoingHost
      , parseInt(config.outgoingPort)
      , config.outgoingUser
      , config.outgoingPass
      , config.outgoingSecure
    );
  }
  web.listen( config.web, config.webUser, config.webPass );

  logger.info('MailDev app running at 127.0.0.1:%s', config.web);

  if (config.open){
    var open = require('open');
    open('http://localhost:' + config.web);
  }

  return mailserver;
};
