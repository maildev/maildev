const EMAIL_ROUTE_PREFIX = '#/email/'

/** Return the selected email ID encoded in a dashboard hash route. */
export function parseEmailRoute(hash: string): string | null {
  if (!hash.startsWith(EMAIL_ROUTE_PREFIX)) {
    return null
  }

  const encodedId = hash.slice(EMAIL_ROUTE_PREFIX.length)
  if (!encodedId || encodedId.includes('/')) {
    return null
  }

  try {
    return decodeURIComponent(encodedId)
  } catch {
    return null
  }
}

/** Build a dashboard hash route compatible with MailDev 2.x email links. */
export function buildEmailRoute(id: string | null): string {
  return id ? `${EMAIL_ROUTE_PREFIX}${encodeURIComponent(id)}` : '#/'
}

/** Update the browser route without adding duplicate history entries. */
export function updateEmailRoute(id: string | null): void {
  if (typeof window === 'undefined') return

  const nextHash = buildEmailRoute(id)
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash
  }
}
