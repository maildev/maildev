import { describe, it, expect } from 'vitest'
import { sanitizeHtml, replaceCidReferences } from '../sanitize.js'

describe('sanitizeHtml', () => {
  it('should return undefined for undefined input', () => {
    expect(sanitizeHtml(undefined)).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    expect(sanitizeHtml('')).toBeUndefined()
  })

  it('should sanitize basic HTML', () => {
    const html = '<p>Hello World</p>'
    const result = sanitizeHtml(html)

    expect(result).toContain('Hello World')
  })

  it('should remove script tags', () => {
    const html = '<p>Safe</p><script>alert("xss")</script>'
    const result = sanitizeHtml(html)

    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert')
    expect(result).toContain('Safe')
  })

  it('should remove onclick handlers', () => {
    const html = '<button onclick="alert(1)">Click</button>'
    const result = sanitizeHtml(html)

    expect(result).not.toContain('onclick')
  })

  it('should preserve link elements', () => {
    const html = '<link rel="stylesheet" href="style.css">'
    const result = sanitizeHtml(html)

    expect(result).toContain('<link')
  })

  it('should preserve target attributes on links', () => {
    const html = '<a href="https://example.com" target="_blank">Link</a>'
    const result = sanitizeHtml(html)

    expect(result).toContain('target="_blank"')
  })

  it('should preserve full document structure', () => {
    const html = '<html><head><title>Test</title></head><body><p>Content</p></body></html>'
    const result = sanitizeHtml(html)

    expect(result).toContain('<html>')
    expect(result).toContain('<head>')
    expect(result).toContain('<body>')
  })
})

describe('replaceCidReferences', () => {
  it('should return original HTML when no attachments', () => {
    const html = '<img src="image.png">'
    const result = replaceCidReferences(html, 'email1', [])

    expect(result).toBe(html)
  })

  it('should replace cid references with URLs', () => {
    const html = '<img src="cid:image123">'
    const attachments = [
      { contentId: 'image123', generatedFileName: 'abc.png' },
    ]

    const result = replaceCidReferences(html, 'email1', attachments)

    expect(result).toContain('/email/email1/attachment/abc.png')
    expect(result).not.toContain('cid:')
  })

  it('should handle single quotes around cid', () => {
    const html = "<img src='cid:image123'>"
    const attachments = [
      { contentId: 'image123', generatedFileName: 'abc.png' },
    ]

    const result = replaceCidReferences(html, 'email1', attachments)

    expect(result).toContain('/email/email1/attachment/abc.png')
  })

  it('should include baseUrl when provided', () => {
    const html = '<img src="cid:image123">'
    const attachments = [
      { contentId: 'image123', generatedFileName: 'abc.png' },
    ]

    const result = replaceCidReferences(html, 'email1', attachments, 'example.com')

    expect(result).toContain('//example.com/email/email1/attachment/abc.png')
  })

  it('should replace multiple cid references', () => {
    const html = '<img src="cid:img1"><img src="cid:img2">'
    const attachments = [
      { contentId: 'img1', generatedFileName: 'a.png' },
      { contentId: 'img2', generatedFileName: 'b.png' },
    ]

    const result = replaceCidReferences(html, 'email1', attachments)

    expect(result).toContain('attachment/a.png')
    expect(result).toContain('attachment/b.png')
    expect(result).not.toContain('cid:')
  })

  it('should URL encode attachment filenames', () => {
    const html = '<img src="cid:image123">'
    const attachments = [
      { contentId: 'image123', generatedFileName: 'file name.png' },
    ]

    const result = replaceCidReferences(html, 'email1', attachments)

    expect(result).toContain('file%20name.png')
  })

  it('should skip attachments without contentId', () => {
    const html = '<img src="cid:image123">'
    const attachments = [
      { generatedFileName: 'other.png' },
      { contentId: 'image123', generatedFileName: 'abc.png' },
    ]

    const result = replaceCidReferences(html, 'email1', attachments)

    expect(result).toContain('abc.png')
    expect(result).not.toContain('other.png')
  })
})
