import { describe, it, expect } from 'vitest'
import { normalizeContentId } from '../attachments.js'

describe('normalizeContentId', () => {
  it('strips surrounding angle brackets', () => {
    expect(normalizeContentId('<image123@host>')).toBe('image123@host')
  })

  it('keeps a bare content id unchanged', () => {
    expect(normalizeContentId('image123@host')).toBe('image123@host')
  })

  it('strips brackets with whitespace inside and out', () => {
    expect(normalizeContentId(' < image123@host > ')).toBe('image123@host')
  })

  it('strips a leading bracket only', () => {
    expect(normalizeContentId('<image123')).toBe('image123')
  })

  it('strips a trailing bracket only', () => {
    expect(normalizeContentId('image123>')).toBe('image123')
  })

  it('trims surrounding whitespace of a bare id', () => {
    expect(normalizeContentId('  image123  ')).toBe('image123')
  })

  it('returns an empty string for a bracket-only id', () => {
    expect(normalizeContentId('<>')).toBe('')
  })
})