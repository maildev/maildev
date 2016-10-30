var logger = require('./logger');

var events = require('events');
var eventEmitter = new events.EventEmitter();

var storage = module.exports = [];

storage.on                 = eventEmitter.on.bind(eventEmitter);
storage.emit               = eventEmitter.emit.bind(eventEmitter);
storage.removeListener     = eventEmitter.removeListener.bind(eventEmitter);
storage.removeAllListeners = eventEmitter.removeAllListeners.bind(eventEmitter);

/**
 * Transforms storage into plain js array
 */
storage.toArray = function() {
  return this.slice(0);
};

/**
 * Transforms storage into plain, empty js array
 */
storage.reset = function() {
  storage.length = 0;     //empties an array
  delete storage.push;    //removes custom push implemenation
};

/**
 * Overrides Array.push function to support limits.
 *
 * Does not remove elements from array. Instead emits a delete message
 * event that is processed by mailserver.
 */
storage.setLimit = function(limit) {
  if(typeof limit !== "undefined" &&
     toString.call(limit) === '[object Number]' &&
     limit > 0){

    limit = Math.ceil(limit);

    //array with limits
    storage.push = function () {
      var args = arguments;

      var size = this.length;
      if(size + args.length > limit) {
        logger.warn('Limit of messages [%s] has been reached.', limit);

        var toRemove = null;

        if(args.length >= limit) {
          toRemove = this.slice(0, limit);
          args = Array.prototype.splice.call(args, 0, limit);
        } else {
          toRemove = this.splice(0, (size + args.length) - limit);
        }

        if(toRemove){
          toRemove.forEach(function(item){
            storage.emit('delete', item);
          });
        }

      }
      return Array.prototype.push.apply(this, args);
    }
  } else {
    throw new Error("Can't set limit for the storage. Limit is not defined or "
        + "it's not a positive number");
  }
};
