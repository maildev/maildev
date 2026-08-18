/**
 * MCP Handler Registration
 *
 * Provides reusable MCP tool, resource, and prompt handlers that can work
 * with either an HTTP client or direct storage access.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type { Email } from '@maildev/core'

/**
 * Interface for email data access
 * Can be implemented by HTTP client or direct storage adapter
 */
export interface EmailDataSource {
  getEmails(): Promise<Email[]>
  getEmail(id: string): Promise<Email>
  deleteEmail(id: string): Promise<void>
  getAttachment(emailId: string, filename: string): Promise<Buffer>
}

/**
 * Search options for filtering emails
 */
export interface SearchOptions {
  query?: string
  from?: string
  to?: string
  subject?: string
  hasAttachment?: boolean
  isUnread?: boolean
  since?: string
  until?: string
  limit?: number
}

/**
 * Format an email for display in MCP responses
 */
function formatEmailSummary(email: Email): string {
  const from = email.from?.[0]?.address || 'unknown'
  const to = email.to?.map((a) => a.address).join(', ') || 'unknown'
  const date = new Date(email.time).toLocaleString()
  const read = email.read ? '' : ' [UNREAD]'
  const attachments =
    email.attachments && email.attachments.length > 0
      ? ` [${email.attachments.length} attachment(s)]`
      : ''

  return `ID: ${email.id}
Subject: ${email.subject || '(no subject)'}${read}
From: ${from}
To: ${to}
Date: ${date}${attachments}`
}

/**
 * Format full email details
 */
function formatEmailFull(email: Email): string {
  const summary = formatEmailSummary(email)
  const text = email.text || '(no text content)'
  const html = email.html ? '\n\n[HTML content available]' : ''

  let attachmentList = ''
  if (email.attachments && email.attachments.length > 0) {
    attachmentList =
      '\n\nAttachments:\n' +
      email.attachments.map((a) => `- ${a.filename} (${a.contentType})`).join('\n')
  }

  return `${summary}

--- Content ---
${text}${html}${attachmentList}`
}

/**
 * Search and filter emails
 */
async function searchEmails(dataSource: EmailDataSource, options: SearchOptions = {}): Promise<Email[]> {
  const emails = await dataSource.getEmails()
  let filtered = emails

  // Apply filters
  if (options.query) {
    const q = options.query.toLowerCase()
    filtered = filtered.filter(
      (e) =>
        e.subject?.toLowerCase().includes(q) ||
        e.text?.toLowerCase().includes(q) ||
        e.from?.some((a) => a.address?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q)) ||
        e.to?.some((a) => a.address?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q))
    )
  }

  if (options.from) {
    const from = options.from.toLowerCase()
    filtered = filtered.filter((e) =>
      e.from?.some((a) => a.address?.toLowerCase().includes(from))
    )
  }

  if (options.to) {
    const to = options.to.toLowerCase()
    filtered = filtered.filter((e) =>
      e.to?.some((a) => a.address?.toLowerCase().includes(to))
    )
  }

  if (options.subject) {
    const subject = options.subject.toLowerCase()
    filtered = filtered.filter((e) => e.subject?.toLowerCase().includes(subject))
  }

  if (options.hasAttachment !== undefined) {
    filtered = filtered.filter((e) =>
      options.hasAttachment
        ? e.attachments && e.attachments.length > 0
        : !e.attachments || e.attachments.length === 0
    )
  }

  if (options.isUnread !== undefined) {
    filtered = filtered.filter((e) => (options.isUnread ? !e.read : e.read))
  }

  if (options.since) {
    const since = new Date(options.since).getTime()
    filtered = filtered.filter((e) => new Date(e.time).getTime() >= since)
  }

  if (options.until) {
    const until = new Date(options.until).getTime()
    filtered = filtered.filter((e) => new Date(e.time).getTime() <= until)
  }

  // Sort by time descending (newest first)
  filtered.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  // Apply limit
  if (options.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit)
  }

  return filtered
}

/**
 * Get inbox statistics
 */
async function getStats(dataSource: EmailDataSource) {
  const emails = await dataSource.getEmails()
  const unreadCount = emails.filter((e) => !e.read).length

  // Sort by time to get newest/oldest
  const sorted = [...emails].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  )

  const newestTime = sorted[0]?.time
  const oldestTime = sorted[sorted.length - 1]?.time

  return {
    emailCount: emails.length,
    unreadCount,
    newestEmail: newestTime instanceof Date ? newestTime.toISOString() : newestTime ?? null,
    oldestEmail: oldestTime instanceof Date ? oldestTime.toISOString() : oldestTime ?? null,
  }
}

/**
 * Register MCP handlers on a server instance
 */
export function registerMCPHandlers(server: Server, dataSource: EmailDataSource): void {
  // ===================
  // TOOLS
  // ===================

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'maildev_search_emails',
          description:
            'Search emails in the MailDev inbox with flexible filters. Returns a list of matching emails.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Text search across subject, from, to, and body',
              },
              from: {
                type: 'string',
                description: 'Filter by sender email address',
              },
              to: {
                type: 'string',
                description: 'Filter by recipient email address',
              },
              subject: {
                type: 'string',
                description: 'Filter by subject line',
              },
              hasAttachment: {
                type: 'boolean',
                description: 'Filter emails with/without attachments',
              },
              isUnread: {
                type: 'boolean',
                description: 'Filter by read/unread status',
              },
              since: {
                type: 'string',
                description: 'Filter emails after this timestamp (ISO 8601)',
              },
              until: {
                type: 'string',
                description: 'Filter emails before this timestamp (ISO 8601)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 20)',
              },
            },
          },
        },
        {
          name: 'maildev_get_email',
          description: 'Get full details of a specific email by ID, including content and attachments.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'The email ID',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'maildev_get_latest_email',
          description: 'Get the most recently received email(s).',
          inputSchema: {
            type: 'object',
            properties: {
              count: {
                type: 'number',
                description: 'Number of recent emails to return (default: 1)',
              },
            },
          },
        },
        {
          name: 'maildev_delete_email',
          description: 'Delete a specific email by ID.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'The email ID to delete',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'maildev_get_attachment',
          description: 'Download an email attachment as base64-encoded content.',
          inputSchema: {
            type: 'object',
            properties: {
              emailId: {
                type: 'string',
                description: 'The email ID',
              },
              filename: {
                type: 'string',
                description: 'The attachment filename',
              },
            },
            required: ['emailId', 'filename'],
          },
        },
      ],
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      switch (name) {
        case 'maildev_search_emails': {
          const params = args as SearchOptions
          const emails = await searchEmails(dataSource, {
            ...params,
            limit: params.limit || 20,
          })

          if (emails.length === 0) {
            return { content: [{ type: 'text', text: 'No emails found matching the criteria.' }] }
          }

          const formatted = emails.map(formatEmailSummary).join('\n\n---\n\n')
          return {
            content: [{ type: 'text', text: `Found ${emails.length} email(s):\n\n${formatted}` }],
          }
        }

        case 'maildev_get_email': {
          const { id } = args as { id: string }
          const email = await dataSource.getEmail(id)
          return { content: [{ type: 'text', text: formatEmailFull(email) }] }
        }

        case 'maildev_get_latest_email': {
          const { count = 1 } = args as { count?: number }
          const emails = await searchEmails(dataSource, { limit: count })

          if (emails.length === 0) {
            return { content: [{ type: 'text', text: 'No emails in the inbox.' }] }
          }

          const firstEmail = emails[0]
          if (count === 1 && firstEmail) {
            return { content: [{ type: 'text', text: formatEmailFull(firstEmail) }] }
          }

          const formatted = emails.map(formatEmailFull).join('\n\n===\n\n')
          return { content: [{ type: 'text', text: formatted }] }
        }

        case 'maildev_delete_email': {
          const { id } = args as { id: string }
          await dataSource.deleteEmail(id)
          return { content: [{ type: 'text', text: `Email ${id} deleted successfully.` }] }
        }

        case 'maildev_get_attachment': {
          const { emailId, filename } = args as { emailId: string; filename: string }
          const content = await dataSource.getAttachment(emailId, filename)
          return {
            content: [
              {
                type: 'text',
                text: `Attachment: ${filename}\nSize: ${content.length} bytes\nContent (base64):\n${content.toString('base64')}`,
              },
            ],
          }
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
    }
  })

  // ===================
  // RESOURCES
  // ===================

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'maildev://emails',
          name: 'All Emails',
          description: 'List of all emails in the MailDev inbox',
          mimeType: 'application/json',
        },
        {
          uri: 'maildev://stats',
          name: 'Inbox Statistics',
          description: 'Statistics about the MailDev inbox',
          mimeType: 'application/json',
        },
      ],
    }
  })

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params

    try {
      if (uri === 'maildev://emails') {
        const emails = await dataSource.getEmails()
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(emails, null, 2),
            },
          ],
        }
      }

      if (uri === 'maildev://stats') {
        const stats = await getStats(dataSource)
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        }
      }

      // Handle maildev://email/{id} pattern
      const emailMatch = uri.match(/^maildev:\/\/email\/(.+)$/)
      if (emailMatch && emailMatch[1]) {
        const id = emailMatch[1]
        const email = await dataSource.getEmail(id)
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(email, null, 2),
            },
          ],
        }
      }

      throw new Error(`Unknown resource: ${uri}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to read resource ${uri}: ${message}`)
    }
  })

  // ===================
  // PROMPTS
  // ===================

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'verify-signup-email',
          description:
            'Check if a signup/verification email was received and extract the verification link',
          arguments: [
            {
              name: 'email',
              description: 'The email address to check for',
              required: true,
            },
          ],
        },
        {
          name: 'check-password-reset',
          description: 'Find password reset email and extract the reset token/link',
          arguments: [
            {
              name: 'email',
              description: 'The email address to check for',
              required: true,
            },
          ],
        },
        {
          name: 'analyze-email-content',
          description: 'Analyze email content for key information like prices, dates, and links',
          arguments: [
            {
              name: 'emailId',
              description: 'The email ID to analyze (or "latest" for most recent)',
              required: false,
            },
          ],
        },
        {
          name: 'monitor-email-delivery',
          description: 'Watch for an expected email and verify its contents',
          arguments: [
            {
              name: 'to',
              description: 'Expected recipient email address',
              required: true,
            },
            {
              name: 'subject',
              description: 'Expected subject line (partial match)',
              required: false,
            },
          ],
        },
      ],
    }
  })

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    switch (name) {
      case 'verify-signup-email': {
        const email = args?.email || 'the user'
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please check if ${email} received a signup or verification email. If found:
1. Confirm the email was received and show when
2. Extract any verification link or code from the email
3. Note any expiration time mentioned
4. Summarize what action the user needs to take

Use the maildev_search_emails tool to find the email, then maildev_get_email to get the full content.`,
              },
            },
          ],
        }
      }

      case 'check-password-reset': {
        const email = args?.email || 'the user'
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please check if ${email} received a password reset email. If found:
1. Confirm the email was received and show when
2. Extract the password reset link or token
3. Note any expiration time mentioned
4. Warn about any security notices in the email

Use the maildev_search_emails tool to find the email, then maildev_get_email to get the full content.`,
              },
            },
          ],
        }
      }

      case 'analyze-email-content': {
        const emailId = args?.emailId || 'latest'
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please analyze the ${emailId === 'latest' ? 'most recent' : ''} email${emailId !== 'latest' ? ` with ID ${emailId}` : ''} and extract:
1. Key information (order numbers, confirmation codes, etc.)
2. Important dates and deadlines
3. Monetary amounts and totals
4. Action items or required steps
5. Any links and their purposes

Use ${emailId === 'latest' ? 'maildev_get_latest_email' : 'maildev_get_email'} to retrieve the email content.`,
              },
            },
          ],
        }
      }

      case 'monitor-email-delivery': {
        const to = args?.to || 'the recipient'
        const subject = args?.subject ? ` with subject containing "${args.subject}"` : ''
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please check if an email was delivered to ${to}${subject}.
1. Search for matching emails
2. If found, show the email details
3. If not found, indicate that no matching email was received yet
4. Provide any relevant timestamps

Use maildev_search_emails with appropriate filters to find the email.`,
              },
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown prompt: ${name}`)
    }
  })
}
