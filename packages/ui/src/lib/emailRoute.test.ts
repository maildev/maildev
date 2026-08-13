import { describe, expect, it } from 'vitest'
import { buildEmailRoute, parseEmailRoute } from './emailRoute'

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
