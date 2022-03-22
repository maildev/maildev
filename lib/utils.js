'use strict'

const utils = module.exports = {}

// Create an unique id, length 8 characters
utils.makeId = function () {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (let i = 0; i < 8; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

// Clone object
utils.clone = function (object) {
  return JSON.parse(JSON.stringify(object))
}

// Format bytes
// Source: https://stackoverflow.com/a/18650828/3143704
utils.formatBytes = function (bytes, decimals = 2) {
  if (bytes === 0) return '0 bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

utils.delay = function (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
