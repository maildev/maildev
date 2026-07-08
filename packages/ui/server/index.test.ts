import { describe, expect, it } from 'vitest'
import { injectBaseTag } from './index'

const HTML = '<!doctype html>\n<html>\n  <head>\n    <title>MailDev</title>\n  </head>\n  <body></body>\n</html>'

describe('injectBaseTag', () => {
  it("injects a root <base> when no base path is configured", () => {
    expect(injectBaseTag(HTML, '')).toContain('<base href="/" />')
  })

  it('injects the configured base path with a trailing slash', () => {
    expect(injectBaseTag(HTML, '/mail')).toContain('<base href="/mail/" />')
  })

  it('does not double the trailing slash', () => {
    expect(injectBaseTag(HTML, '/mail/')).toContain('<base href="/mail/" />')
    expect(injectBaseTag(HTML, '/mail/')).not.toContain('//"')
  })

  it('inserts the tag inside <head>, keeping existing content', () => {
    const out = injectBaseTag(HTML, '/mail')
    expect(out.indexOf('<base')).toBeGreaterThan(out.indexOf('<head>'))
    expect(out.indexOf('<base')).toBeLessThan(out.indexOf('<title>'))
  })
})
