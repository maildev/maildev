
/**
 * MailDev - logger.js
 */

var logToConsole = false;

module.exports = {};


/**
 * Initialize the logger
 */

module.exports.init = function(log){
  logToConsole = log;
};

/**
 * The info method will always log to the console
 */

module.exports.info = console.info.bind(console);


/**
 * Extend the basic console.x functions, checking if the logging is on
 */

['log', 'dir', 'warn', 'error'].forEach(function(fn){

  module.exports[ fn ] = function(){
    if ( logToConsole ) {
      console[ fn ].apply(console, arguments);
    }
  };

});