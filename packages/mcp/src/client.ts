/**
 * HTTP client for communicating with the MailDev REST API
 */

import type { Email } from '@maildev/core'

export interface MailDevClientOptions {
  /** Base URL for the MailDev API (default: http://localhost:1080) */
  baseUrl?: string
  /** API key for authentication (optional) */
  apiKey?: string
}

export interface MailDevStats {
  emailCount: number
  unreadCount: number
  newestEmail: string | null
  oldestEmail: string | null
}

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

export class MailDevClient {
  private baseUrl: string
  private apiKey?: string

  constructor(options: MailDevClientOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.MAILDEV_API_URL || 'http://localhost:1080'
    const apiKey = options.apiKey || process.env.MAILDEV_API_KEY
    if (apiKey) {
      this.apiKey = apiKey
    }
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error')
      throw new Error(`MailDev API error (${response.status}): ${error}`)
    }

    // Handle empty responses
    const text = await response.text()
    if (!text) {
      return {} as T
    }

    return JSON.parse(text) as T
  }

  /**
   * Get all emails
   */
  async getEmails(): Promise<Email[]> {
    return this.fetch<Email[]>('/email')
  }

  /**
   * Get a single email by ID
   */
  async getEmail(id: string): Promise<Email> {
    return this.fetch<Email>(`/email/${id}`)
  }

  /**
   * Get email HTML content
   */
  async getEmailHtml(id: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/email/${id}/html`)
    if (!response.ok) {
      throw new Error(`Failed to get email HTML: ${response.statusText}`)
    }
    return response.text()
  }

  /**
   * Get email source (raw .eml)
   */
  async getEmailSource(id: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/email/${id}/source`)
    if (!response.ok) {
      throw new Error(`Failed to get email source: ${response.statusText}`)
    }
    return response.text()
  }

  /**
   * Search emails with filters
   */
  async searchEmails(options: SearchOptions = {}): Promise<Email[]> {
    const emails = await this.getEmails()
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
   * Delete an email by ID
   */
  async deleteEmail(id: string): Promise<void> {
    await this.fetch(`/email/${id}`, { method: 'DELETE' })
  }

  /**
   * Delete all emails
   */
  async deleteAllEmails(): Promise<number> {
    const emails = await this.getEmails()
    const count = emails.length
    await this.fetch('/email', { method: 'DELETE' })
    return count
  }

  /**
   * Relay an email
   */
  async relayEmail(id: string, to?: string): Promise<void> {
    const path = to ? `/email/${id}/relay/${encodeURIComponent(to)}` : `/email/${id}/relay`
    await this.fetch(path, { method: 'POST' })
  }

  /**
   * Mark email as read
   */
  async markRead(id: string, read: boolean = true): Promise<void> {
    await this.fetch(`/email/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ read }),
    })
  }

  /**
   * Mark all emails as read
   */
  async markAllRead(): Promise<void> {
    await this.fetch('/email/read', { method: 'PATCH' })
  }

  /**
   * Get attachment content
   */
  async getAttachment(emailId: string, filename: string): Promise<Buffer> {
    const response = await fetch(
      `${this.baseUrl}/email/${emailId}/attachment/${encodeURIComponent(filename)}`
    )
    if (!response.ok) {
      throw new Error(`Failed to get attachment: ${response.statusText}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Get inbox statistics
   */
  async getStats(): Promise<MailDevStats> {
    const emails = await this.getEmails()
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
   * Get server config
   */
  async getConfig(): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>('/config')
  }
}
