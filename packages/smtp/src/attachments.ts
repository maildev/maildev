/**
 * @maildev/smtp - Attachment helpers
 *
 * Utilities for handling email attachments securely.
 */

import { createHash } from 'node:crypto'
import { extname, join, format as formatPath } from 'node:path'
import type { ParsedAttachment, TransformedAttachment } from './types.js'

/**
 * Generate a secure filename for an attachment
 * Uses MD5 hash of contentId to prevent path traversal attacks
 *
 * This addresses CVE-2024-27448 by not using user-supplied filenames directly
 *
 * @param attachment - The parsed attachment
 * @returns Secure generated filename
 */
export function generateSecureFilename(attachment: ParsedAttachment): string {
  // Get original extension from the filename or fall back to contentType
  const originalFilename = attachment.filename || ''
  let ext = extname(originalFilename)

  // If no extension from filename, try to infer from content type
  if (!ext && attachment.contentType) {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'text/html': '.html',
      'application/json': '.json',
    }
    ext = mimeToExt[attachment.contentType] || ''
  }

  // Generate hash from contentId, falling back to filename + size
  const hashSource = attachment.contentId || `${originalFilename}-${attachment.size}`
  const hash = createHash('md5').update(hashSource).digest('hex')

  return formatPath({ name: hash, ext })
}

/**
 * Transform a parsed attachment into a transformed attachment with secure filename
 *
 * @param attachment - The parsed attachment from mailparser
 * @returns Transformed attachment with secure filename
 */
export function transformAttachment(attachment: ParsedAttachment): TransformedAttachment {
  // Determine content disposition
  const disposition: 'inline' | 'attachment' = attachment.contentDisposition === 'inline'
    ? 'inline'
    : 'attachment'

  return {
    filename: attachment.filename || '',
    generatedFileName: generateSecureFilename(attachment),
    contentType: attachment.contentType,
    contentDisposition: disposition,
    contentId: attachment.contentId,
    size: attachment.size,
    checksum: attachment.checksum,
    transformed: true,
  }
}

/**
 * Get the full file path for an attachment on disk
 *
 * @param mailDir - The mail directory path
 * @param emailId - The email ID
 * @param attachment - The transformed attachment
 * @returns Full path to the attachment file
 * @throws Error if attachment has not been transformed
 */
export function getAttachmentFilePath(
  mailDir: string,
  emailId: string,
  attachment: TransformedAttachment
): string {
  if (!attachment.transformed) {
    throw new Error('Attachment must be transformed prior to reading file path')
  }
  return join(mailDir, emailId, attachment.generatedFileName)
}

/**
 * Get the directory path for storing attachments for an email
 *
 * @param mailDir - The mail directory path
 * @param emailId - The email ID
 * @returns Path to the attachments directory for this email
 */
export function getAttachmentDir(mailDir: string, emailId: string): string {
  return join(mailDir, emailId)
}
