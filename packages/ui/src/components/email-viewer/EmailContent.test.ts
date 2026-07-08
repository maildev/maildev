import { describe, expect, it, vi } from 'vitest'
import { getEmailDocumentHeight } from './EmailContent'

function setMetric(element: Element, name: string, value: number) {
  Object.defineProperty(element, name, {
    configurable: true,
    value,
  })
}

function rect(values: Partial<DOMRect>): DOMRect {
  return {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...values,
  }
}

describe('getEmailDocumentHeight', () => {
  it('uses the largest available document height metric', () => {
    const doc = document.implementation.createHTMLDocument('email')

    setMetric(doc.documentElement, 'scrollHeight', 1200)
    setMetric(doc.documentElement, 'offsetHeight', 900)
    setMetric(doc.documentElement, 'clientHeight', 600)
    setMetric(doc.body, 'scrollHeight', 1100)
    setMetric(doc.body, 'offsetHeight', 1000)

    expect(getEmailDocumentHeight(doc)).toBe(1200)
  })

  it('accounts for content extending beyond body scroll height', () => {
    const doc = document.implementation.createHTMLDocument('email')
    const footer = doc.createElement('footer')
    doc.body.appendChild(footer)

    setMetric(doc.documentElement, 'scrollHeight', 600)
    setMetric(doc.documentElement, 'offsetHeight', 600)
    setMetric(doc.documentElement, 'clientHeight', 600)
    setMetric(doc.body, 'scrollHeight', 600)
    setMetric(doc.body, 'offsetHeight', 600)

    vi.spyOn(doc.body, 'getBoundingClientRect').mockReturnValue(rect({ top: 8 }))
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(rect({ bottom: 1498 }))

    expect(getEmailDocumentHeight(doc)).toBe(1490)
  })
})
