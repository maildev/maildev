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

/**
 * Update the browser route to reflect the selected email.
 *
 * Uses `pushState` by default so deliberate opens are retraceable with the
 * browser back/forward buttons. Pass `{ replace: true }` for selection changes
 * that are side-effects rather than navigation the user should be able to walk
 * back through (auto-showing arriving mail, search auto-select, reselecting
 * after a delete) so they don't flood the history stack.
 *
 * Neither `pushState` nor `replaceState` fires a `hashchange` event, so callers
 * are responsible for updating the selection state themselves; genuine
 * back/forward navigation still fires `hashchange` and is handled by
 * {@link useEmailRoute}.
 */
export function updateEmailRoute(
  id: string | null,
  options: { replace?: boolean } = {}
): void {
  if (typeof window === 'undefined') return

  const nextHash = buildEmailRoute(id)
  if (window.location.hash === nextHash) return

  if (options.replace) {
    window.history.replaceState(null, '', nextHash)
  } else {
    window.history.pushState(null, '', nextHash)
  }
}
