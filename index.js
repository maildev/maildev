
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

module.exports = {};

module.exports.run = function(args){
  
  var version = pkg.version;

  args = args || process.argv;

  // CLI
  program
    .version(version)
    .option('-s, --smtp [port]', 'SMTP port to catch emails [1025]', '1025')
    .option('-w, --web [port]', 'Port to run the Web GUI [1080]', '1080')
    .option('--forward-host <host>', 'SMTP host to forward emails')
    .option('--forward-port <port>', 'SMTP port to forward emails')
    .option('--forward-user <user>', 'SMTP user to forward emails')
    .option('--forward-pass <pass>', 'SMTP password to forward emails')
    .option('--forward-secure', 'Use SMTP SSL to forward emails')
    .option('-o, --open', 'Open the Web GUI after startup')
    .option('-v, --verbose')
    .parse(args);


  if (parseInt(program.smtp, 10) < 1000 || parseInt(program.web, 10) < 1000){
    throw new Error('Please choose a port above 1000');
  }

  if (program.verbose){
    logger.init(true);
  }
  
  // Start the Mailserver & Web GUI
  mailserver.listen( program.smtp );
  if (
      program.forwardHost ||
      program.forwardPort ||
      program.forwardUser ||
      program.forwardPass ||
      program.forwardSecure
      ){
    mailserver.setupForwarding(
        program.forwardHost
      , parseInt(program.forwardPort)
      , program.forwardUser
      , program.forwardPass
      , program.forwardSecure
    );
  }
  web.listen( program.web );

  logger.info('MailDev app running at 127.0.0.1:%s', program.web);

  if (program.open){
    var open = require('open');
    open('http://localhost:' + program.web);
  }

};
