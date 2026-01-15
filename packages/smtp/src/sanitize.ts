/**
 * @maildev/smtp - HTML Sanitization
 *
 * Safe HTML sanitization for email content using DOMPurify.
 */

import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Create a window object for DOMPurify
const { window } = new JSDOM('')
const DOMPurify = createDOMPurify(window)

/**
 * Sanitize HTML content from email for safe display
 *
 * This uses DOMPurify with settings appropriate for email content:
 * - Preserves the full HTML document structure (html, head, body)
 * - Allows link elements for external stylesheets
 * - Preserves target attributes on links
 * - Disables DOM clobbering sanitization to preserve form id/name attributes
 *
 * @param html - Raw HTML content from email
 * @returns Sanitized HTML safe for display
 */
export function sanitizeHtml(html: string | undefined): string | undefined {
  if (!html) {
    return undefined
  }

  return DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true, // Preserve html, head, body elements
    SANITIZE_DOM: false, // Ignore DOM clobbering to preserve form id/name attributes
    ADD_TAGS: ['link'], // Allow link element to preserve external style sheets
    ADD_ATTR: ['target'], // Preserve explicit target attributes on links
  })
}

/**
 * Replace CID references in HTML with actual URLs
 *
 * Embedded attachments in emails use cid: URLs that need to be
 * replaced with actual accessible URLs.
 *
 * @param html - HTML content with cid: references
 * @param emailId - ID of the email
 * @param attachments - Array of attachments with contentId
 * @param baseUrl - Optional base URL for attachment URLs
 * @returns HTML with cid: references replaced with actual URLs
 */
export function replaceCidReferences(
  html: string,
  emailId: string,
  attachments: Array<{ contentId?: string; generatedFileName: string }>,
  baseUrl?: string
): string {
  if (!attachments || attachments.length === 0) {
    return html
  }

  let result = html

  // Find attachments with content IDs (embedded attachments)
  const embeddedAttachments = attachments.filter((a) => a.contentId)

  for (const attachment of embeddedAttachments) {
    if (!attachment.contentId) continue

    // Match src="cid:xxx" or src='cid:xxx'
    const regex = new RegExp(
      `src=("|')cid:${escapeRegExp(attachment.contentId)}("|')`,
      'g'
    )

    const url = buildAttachmentUrl(emailId, attachment.generatedFileName, baseUrl)
    const replacement = `src="${url}"`

    result = result.replace(regex, replacement)
  }

  return result
}

/**
 * Build URL for an attachment
 */
function buildAttachmentUrl(
  emailId: string,
  filename: string,
  baseUrl?: string
): string {
  const base = baseUrl ? `//${baseUrl}` : ''
  return `${base}/email/${emailId}/attachment/${encodeURIComponent(filename)}`
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
