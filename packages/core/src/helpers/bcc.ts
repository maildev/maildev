import type { Address, EnvelopeAddress } from '../types/index.js'

/**
 * Extract email address string from an Address object
 */
function getAddressString(addr: Address | EnvelopeAddress | string): string {
  if (typeof addr === 'string') {
    return addr.toLowerCase()
  }
  return addr.address.toLowerCase()
}

/**
 * Calculate BCC addresses by comparing envelope recipients with headers
 *
 * BCC addresses are recipients in the SMTP envelope who are NOT listed
 * in the To or CC headers of the email.
 *
 * @param envelopeRecipients - Recipients from SMTP RCPT TO commands
 * @param toAddresses - Parsed To header addresses
 * @param ccAddresses - Parsed CC header addresses (optional)
 * @returns Array of BCC addresses (recipients not in To or CC)
 */
export function calculateBcc(
  envelopeRecipients: (EnvelopeAddress | string)[],
  toAddresses: Address[],
  ccAddresses: Address[] = []
): Address[] {
  // Create sets of known addresses (To and CC) for fast lookup
  const toSet = new Set(toAddresses.map(getAddressString))
  const ccSet = new Set(ccAddresses.map(getAddressString))

  const bccAddresses: Address[] = []

  for (const recipient of envelopeRecipients) {
    const address = getAddressString(recipient)

    // Skip if this address is in To or CC headers
    if (toSet.has(address) || ccSet.has(address)) {
      continue
    }

    // This is a BCC recipient
    bccAddresses.push({
      address: typeof recipient === 'string' ? recipient : recipient.address,
      name: typeof recipient === 'string' ? '' : recipient.name || '',
    })
  }

  return bccAddresses
}
