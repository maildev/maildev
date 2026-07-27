import type { Email, EmailSummary } from '@maildev/core'

const API_BASE = '/api'

export interface ConfigResponse {
  version: string
  smtpPort?: number
  isOutgoingEnabled: boolean
  outgoingHost?: string | null
}

/**
 * One page of the inbox, as returned by `GET /api/email/summary`
 */
export interface EmailSummaryPage {
  /** The requested page, newest first */
  items: EmailSummary[]
  /** Emails matching the search, ignoring pagination */
  total: number
  /** Emails held by the server, ignoring the search */
  storeTotal: number
  /** Unread emails held by the server */
  unread: number
  /** The skip that was applied */
  skip: number
  /** The limit that was applied */
  limit: number
}

/**
 * Parameters for a summary page request
 */
export interface EmailSummaryParams {
  skip?: number
  limit?: number
  search?: string
}

/**
 * MailDev API client
 */
export const api = {
  /**
   * Email endpoints
   */
  emails: {
    /**
     * Get one page of email summaries
     *
     * This is what the list view uses. Summaries carry no message bodies, so a
     * page stays a few kilobytes no matter how large the inbox is.
     */
    getSummaries: async (params: EmailSummaryParams = {}): Promise<EmailSummaryPage> => {
      const query = new URLSearchParams()
      if (params.skip) query.set('skip', String(params.skip))
      if (params.limit) query.set('limit', String(params.limit))
      if (params.search) query.set('search', params.search)

      const response = await fetch(`${API_BASE}/email/summary?${query.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.statusText}`)
      }
      return response.json()
    },

    /**
     * Get all emails, bodies included
     *
     * Only appropriate for small inboxes — prefer `getSummaries` for listings.
     */
    getAll: async (): Promise<Email[]> => {
      const response = await fetch(`${API_BASE}/email`)
      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.statusText}`)
      }
      return response.json()
    },

    /**
     * Get a single email by ID
     */
    getById: async (id: string): Promise<Email> => {
      const response = await fetch(`${API_BASE}/email/${id}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch email: ${response.statusText}`)
      }
      return response.json()
    },

    /**
     * Delete a single email
     */
    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE}/email/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`Failed to delete email: ${response.statusText}`)
      }
    },

    /**
     * Delete all emails
     */
    deleteAll: async (): Promise<void> => {
      const response = await fetch(`${API_BASE}/email/all`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`Failed to delete all emails: ${response.statusText}`)
      }
    },

    /**
     * Mark all emails as read
     */
    markAllRead: async (): Promise<number> => {
      const response = await fetch(`${API_BASE}/email/read-all`, {
        method: 'PATCH',
      })
      if (!response.ok) {
        throw new Error(`Failed to mark emails as read: ${response.statusText}`)
      }
      return response.json()
    },

    /**
     * Get email HTML content
     */
    getHtml: async (id: string): Promise<string> => {
      const response = await fetch(`${API_BASE}/email/${id}/html`)
      if (!response.ok) {
        throw new Error(`Failed to fetch email HTML: ${response.statusText}`)
      }
      return response.text()
    },

    /**
     * Get raw email source
     */
    getSource: async (id: string): Promise<string> => {
      const response = await fetch(`${API_BASE}/email/${id}/source`)
      if (!response.ok) {
        throw new Error(`Failed to fetch email source: ${response.statusText}`)
      }
      return response.text()
    },

    /**
     * Download email as .eml file
     */
    downloadUrl: (id: string): string => {
      return `${API_BASE}/email/${id}/download`
    },

    /**
     * Get attachment URL
     */
    attachmentUrl: (emailId: string, filename: string): string => {
      return `${API_BASE}/email/${emailId}/attachment/${encodeURIComponent(filename)}`
    },

    /**
     * Relay email
     */
    relay: async (id: string, relayTo?: string): Promise<void> => {
      const url = relayTo
        ? `${API_BASE}/email/${id}/relay/${encodeURIComponent(relayTo)}`
        : `${API_BASE}/email/${id}/relay`
      const response = await fetch(url, { method: 'POST' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to relay email')
      }
    },
  },

  /**
   * Config endpoints
   */
  config: {
    /**
     * Get server configuration
     */
    get: async (): Promise<ConfigResponse> => {
      const response = await fetch(`${API_BASE}/config`)
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`)
      }
      return response.json()
    },
  },

  /**
   * Health check
   */
  health: {
    check: async (): Promise<boolean> => {
      const response = await fetch(`${API_BASE}/healthz`)
      return response.ok
    },
  },
}
