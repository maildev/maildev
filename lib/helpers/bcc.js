'use strict'

const bccHelpers = module.exports = {}

/**
 * Filter out bcc addresses out of recipients.
 */
bccHelpers.calculateBcc = function (recipients, to, cc) {
  cc = cc.slice()
  to = to.slice()
  const containsAddress = (as, a) => as.indexOf(a) !== -1
  const removeAddress = (as, a) => {
    const i = as.indexOf(a)
    if (i !== -1) as.splice(i, 1)
  }

  const bccAddresses = []
  for (const address of recipients) {
    if (containsAddress(cc, address)) {
      removeAddress(cc, address)
      continue
    }
    if (containsAddress(to, address)) {
      removeAddress(to, address)
      continue
    }
    bccAddresses.push({ address, name: '' })
  }
  return bccAddresses
}
