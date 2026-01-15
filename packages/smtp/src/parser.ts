/**
 * @maildev/smtp - Email Parser
 *
 * Promise-based wrapper around mailparser for parsing email content.
 */

import { simpleParser } from 'mailparser'
import type { ParsedMail, Attachment as MailparserAttachment, AddressObject, EmailAddress } from 'mailparser'
import { createReadStream } from 'node:fs'
import type { Readable } from 'node:stream'
import type { ParsedEmail, ParsedAttachment, Address } from './types.js'

/**
 * Parse an email from a file path
 * @param emlPath - Path to the .eml file
 * @returns Parsed email object
 */
export async function parseEmailFile(emlPath: string): Promise<ParsedEmail> {
  const stream = createReadStream(emlPath)
  return parseEmailStream(stream)
}

/**
 * Parse an email from a readable stream
 * @param stream - Readable stream containing email data
 * @returns Parsed email object
 */
export async function parseEmailStream(stream: Readable): Promise<ParsedEmail> {
  const parsed = await simpleParser(stream)
  return transformParsedMail(parsed)
}

/**
 * Parse an email from a buffer or string
 * @param source - Buffer or string containing email data
 * @returns Parsed email object
 */
export async function parseEmailBuffer(source: Buffer | string): Promise<ParsedEmail> {
  const parsed = await simpleParser(source)
  return transformParsedMail(parsed)
}

/**
 * Transform mailparser output to our internal ParsedEmail format
 */
function transformParsedMail(parsed: ParsedMail): ParsedEmail {
  return {
    subject: parsed.subject,
    from: transformAddressObject(parsed.from),
    to: transformAddressField(parsed.to),
    cc: transformAddressField(parsed.cc),
    bcc: transformAddressField(parsed.bcc),
    date: parsed.date,
    html: parsed.html || undefined,
    text: parsed.text,
    headers: transformHeaders(parsed.headers),
    messageId: parsed.messageId,
    inReplyTo: parsed.inReplyTo,
    priority: parsed.priority,
    attachments: parsed.attachments?.map(transformAttachment),
  }
}

/**
 * Transform headers map, filtering out non-string values
 */
function transformHeaders(headers: ParsedMail['headers']): Map<string, string | string[]> | undefined {
  if (!headers) {
    return undefined
  }

  const result = new Map<string, string | string[]>()
  headers.forEach((value, key) => {
    // Only keep string values, skip Date and other types
    if (typeof value === 'string') {
      result.set(key, value)
    } else if (Array.isArray(value)) {
      // Filter array to only include strings
      const stringValues = value.filter((v): v is string => typeof v === 'string')
      if (stringValues.length > 0) {
        result.set(key, stringValues)
      }
    }
  })
  return result
}

/**
 * Transform address object (single) to array of addresses
 */
function transformAddressObject(
  addressObj: AddressObject | undefined
): Address[] | undefined {
  if (!addressObj) {
    return undefined
  }

  return addressObj.value.map((addr: EmailAddress) => ({
    address: addr.address || '',
    name: addr.name || '',
  }))
}

/**
 * Transform address field which can be single or array
 */
function transformAddressField(
  addressField: AddressObject | AddressObject[] | undefined
): Address[] | undefined {
  if (!addressField) {
    return undefined
  }

  if (Array.isArray(addressField)) {
    return addressField.flatMap((obj: AddressObject) =>
      obj.value.map((addr: EmailAddress) => ({
        address: addr.address || '',
        name: addr.name || '',
      }))
    )
  }

  return addressField.value.map((addr: EmailAddress) => ({
    address: addr.address || '',
    name: addr.name || '',
  }))
}

/**
 * Transform mailparser attachment to our internal format
 */
function transformAttachment(attachment: MailparserAttachment): ParsedAttachment {
  return {
    filename: attachment.filename,
    contentType: attachment.contentType,
    contentDisposition: attachment.contentDisposition,
    contentId: attachment.contentId,
    size: attachment.size,
    content: attachment.content,
    checksum: attachment.checksum,
    headers: transformAttachmentHeaders(attachment.headers),
  }
}

/**
 * Transform attachment headers to simple Map<string, string>
 */
function transformAttachmentHeaders(
  headers: MailparserAttachment['headers']
): Map<string, string> | undefined {
  if (!headers) {
    return undefined
  }

  const result = new Map<string, string>()
  headers.forEach((value, key) => {
    if (typeof value === 'string') {
      result.set(key, value)
    }
  })
  return result
}

export { ParsedEmail, ParsedAttachment }
