import type { Email, EmailSummary } from '../types/index.js'

/** How much of the body to keep for the list preview */
const PREVIEW_LENGTH = 140

/**
 * Project an email down to the fields a list view renders
 *
 * The bodies and headers are dropped. For a typical email this is the
 * difference between ~12 KB and ~400 bytes, which is what keeps listing a large
 * inbox affordable.
 * @param email - Email to project
 * @returns Summary of the email
 */
export function toSummary(email: Email): EmailSummary {
  const summary: EmailSummary = {
    id: email.id,
    time: email.time,
    read: email.read,
    subject: email.subject,
    size: email.size,
    sizeHuman: email.sizeHuman,
    from: email.from,
    to: email.to,
    attachmentCount: email.attachments?.length ?? 0,
    preview: email.text ? email.text.replace(/\s+/g, ' ').trim().slice(0, PREVIEW_LENGTH) : '',
  }

  if (email.cc && email.cc.length > 0) {
    summary.cc = email.cc
  }

  return summary
}
