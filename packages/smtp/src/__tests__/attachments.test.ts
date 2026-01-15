import { describe, it, expect } from 'vitest'
import {
  generateSecureFilename,
  transformAttachment,
  getAttachmentFilePath,
  getAttachmentDir,
} from '../attachments.js'
import type { ParsedAttachment } from '../types.js'

describe('generateSecureFilename', () => {
  it('should generate hash-based filename with original extension', () => {
    const attachment: ParsedAttachment = {
      filename: 'document.pdf',
      contentType: 'application/pdf',
      contentId: 'abc123',
      size: 1024,
    }

    const result = generateSecureFilename(attachment)

    expect(result).toMatch(/^[a-f0-9]{32}\.pdf$/)
  })

  it('should infer extension from content type when filename has none', () => {
    const attachment: ParsedAttachment = {
      filename: 'image',
      contentType: 'image/png',
      contentId: 'xyz789',
      size: 2048,
    }

    const result = generateSecureFilename(attachment)

    expect(result).toMatch(/^[a-f0-9]{32}\.png$/)
  })

  it('should use contentId for hash generation', () => {
    const att1: ParsedAttachment = {
      filename: 'file.txt',
      contentType: 'text/plain',
      contentId: 'unique-id-1',
      size: 100,
    }

    const att2: ParsedAttachment = {
      filename: 'file.txt',
      contentType: 'text/plain',
      contentId: 'unique-id-2',
      size: 100,
    }

    const result1 = generateSecureFilename(att1)
    const result2 = generateSecureFilename(att2)

    expect(result1).not.toBe(result2)
  })

  it('should fall back to filename + size for hash when no contentId', () => {
    const attachment: ParsedAttachment = {
      filename: 'document.pdf',
      contentType: 'application/pdf',
      size: 1024,
    }

    const result = generateSecureFilename(attachment)

    expect(result).toMatch(/^[a-f0-9]{32}\.pdf$/)
  })
})

describe('transformAttachment', () => {
  it('should transform parsed attachment to storage format', () => {
    const parsed: ParsedAttachment = {
      filename: 'report.pdf',
      contentType: 'application/pdf',
      contentDisposition: 'attachment',
      contentId: 'report-id',
      size: 4096,
      checksum: 'abc123',
    }

    const result = transformAttachment(parsed)

    expect(result.filename).toBe('report.pdf')
    expect(result.contentType).toBe('application/pdf')
    expect(result.contentDisposition).toBe('attachment')
    expect(result.contentId).toBe('report-id')
    expect(result.size).toBe(4096)
    expect(result.checksum).toBe('abc123')
    expect(result.transformed).toBe(true)
    expect(result.generatedFileName).toMatch(/^[a-f0-9]{32}\.pdf$/)
  })

  it('should set contentDisposition to inline when specified', () => {
    const parsed: ParsedAttachment = {
      filename: 'image.png',
      contentType: 'image/png',
      contentDisposition: 'inline',
      size: 1024,
    }

    const result = transformAttachment(parsed)

    expect(result.contentDisposition).toBe('inline')
  })

  it('should default contentDisposition to attachment', () => {
    const parsed: ParsedAttachment = {
      filename: 'file.txt',
      contentType: 'text/plain',
      size: 512,
    }

    const result = transformAttachment(parsed)

    expect(result.contentDisposition).toBe('attachment')
  })

  it('should handle missing filename', () => {
    const parsed: ParsedAttachment = {
      contentType: 'application/octet-stream',
      size: 100,
    }

    const result = transformAttachment(parsed)

    expect(result.filename).toBe('')
    expect(result.generatedFileName).toMatch(/^[a-f0-9]{32}$/)
  })
})

describe('getAttachmentFilePath', () => {
  it('should return full path to attachment file', () => {
    const result = getAttachmentFilePath('/mail', 'email123', {
      filename: 'doc.pdf',
      generatedFileName: 'abc123.pdf',
      contentType: 'application/pdf',
      contentDisposition: 'attachment',
      size: 1024,
      transformed: true,
    })

    expect(result).toBe('/mail/email123/abc123.pdf')
  })

  it('should throw if attachment is not transformed', () => {
    expect(() =>
      getAttachmentFilePath('/mail', 'email123', {
        filename: 'doc.pdf',
        generatedFileName: 'abc123.pdf',
        contentType: 'application/pdf',
        contentDisposition: 'attachment',
        size: 1024,
        transformed: false as unknown as true,
      })
    ).toThrow('Attachment must be transformed prior to reading file path')
  })
})

describe('getAttachmentDir', () => {
  it('should return attachments directory for email', () => {
    const result = getAttachmentDir('/mail', 'email123')

    expect(result).toBe('/mail/email123')
  })
})
