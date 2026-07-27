import { afterEach, describe, expect, it } from 'vitest'
import { getBasePath } from './basePath'

function setBaseHref(href: string | null): void {
  document.head.querySelector('base')?.remove()
  if (href !== null) {
    const base = document.createElement('base')
    base.setAttribute('href', href)
    document.head.appendChild(base)
  }
}

describe('getBasePath', () => {
  afterEach(() => setBaseHref(null))

  it("returns '' when served at the root (base href '/')", () => {
    setBaseHref('/')
    expect(getBasePath()).toBe('')
  })

  it("returns '' when no <base> tag is present (dev server)", () => {
    setBaseHref(null)
    expect(getBasePath()).toBe('')
  })

  it('returns the prefix without a trailing slash for a sub-path', () => {
    setBaseHref('/mail/')
    expect(getBasePath()).toBe('/mail')
  })

  it('handles a nested base path', () => {
    setBaseHref('/apps/mail/')
    expect(getBasePath()).toBe('/apps/mail')
  })
})
