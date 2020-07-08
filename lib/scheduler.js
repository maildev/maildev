'use strict'

const events = require('events')

const eventEmitter = new events.EventEmitter()
let nextAtTime = 0
let timer = 0

/**
 * Scheduler exports.
 */
const scheduler = module.exports = {}

scheduler.on = eventEmitter.on.bind(eventEmitter)
scheduler.emit = eventEmitter.emit.bind(eventEmitter)
scheduler.removeListener = eventEmitter.removeListener.bind(eventEmitter)
scheduler.removeAllListeners = eventEmitter.removeAllListeners.bind(eventEmitter)

scheduler.resetTime = function (time) {
  const atTime = (new Date(time)).getTime()
  if (nextAtTime > 0 && atTime > nextAtTime) {
    return
  }

  nextAtTime = atTime
  const now = (new Date()).getTime()
  const timeout = nextAtTime - now

  clearTimeout(timer)
  timer = setTimeout(
    function () {
      nextAtTime = 0
      eventEmitter.emit('timeout')
    },
    timeout > 0 ? timeout : 0
  )
}
