import { beforeEach, describe, expect, it } from 'vitest'
import { buildEmailRoute, parseEmailRoute, updateEmailRoute } from './emailRoute'

describe('email dashboard routes', () => {
  it('builds and parses the MailDev email route', () => {
    const hash = buildEmailRoute('email id/with/slashes')

    expect(hash).toBe('#/email/email%20id%2Fwith%2Fslashes')
    expect(parseEmailRoute(hash)).toBe('email id/with/slashes')
  })

  it('uses the dashboard route when no email is selected', () => {
    expect(buildEmailRoute(null)).toBe('#/')
    expect(parseEmailRoute('#/')).toBeNull()
  })

  it('rejects malformed or unrelated routes', () => {
    expect(parseEmailRoute('#/email/')).toBeNull()
    expect(parseEmailRoute('#/email/not/one-id')).toBeNull()
    expect(parseEmailRoute('#/settings')).toBeNull()
    expect(parseEmailRoute('#/email/%E0%A4%A')).toBeNull()
  })
})

describe('updateEmailRoute', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/')
  })

  it('pushes a new history entry by default', () => {
    const before = window.history.length

    updateEmailRoute('abc123')

    expect(window.location.hash).toBe('#/email/abc123')
    expect(window.history.length).toBe(before + 1)
  })

  it('replaces the current entry when asked', () => {
    const before = window.history.length

    updateEmailRoute('abc123', { replace: true })

    expect(window.location.hash).toBe('#/email/abc123')
    expect(window.history.length).toBe(before)
  })

  it('is a no-op when the route already matches', () => {
    updateEmailRoute('abc123')
    const length = window.history.length

    updateEmailRoute('abc123')

    expect(window.history.length).toBe(length)
  })
})
