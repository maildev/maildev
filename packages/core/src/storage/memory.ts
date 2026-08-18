import type { Email, Storage, StorageOptions, StorageQuery } from '../types/index.js'
import { filterEmails } from '../utils/filter.js'

/**
 * In-memory storage implementation
 * Stores emails in a simple array with no persistence
 */
export class MemoryStorage implements Storage {
  readonly options: StorageOptions
  protected emails: Email[] = []

  constructor(options: StorageOptions = {}) {
    this.options = {
      maxEmails: 0,
      ...options,
    }
  }

  /**
   * Get all emails in the store
   */
  async getAll(): Promise<Email[]> {
    return [...this.emails]
  }

  /**
   * Get a single email by ID
   */
  async getById(id: string): Promise<Email | undefined> {
    return this.emails.find((email) => email.id === id)
  }

  /**
   * Save an email to the store
   * If maxEmails is set and exceeded, removes oldest emails
   */
  async save(email: Email): Promise<void> {
    // Check if email with this ID already exists
    const existingIndex = this.emails.findIndex((e) => e.id === email.id)
    if (existingIndex >= 0) {
      // Update existing email
      this.emails[existingIndex] = email
    } else {
      // Add new email
      this.emails.push(email)

      // Enforce maxEmails limit
      if (this.options.maxEmails && this.options.maxEmails > 0) {
        while (this.emails.length > this.options.maxEmails) {
          this.emails.shift() // Remove oldest
        }
      }
    }
  }

  /**
   * Delete an email by ID
   */
  async delete(id: string): Promise<boolean> {
    const index = this.emails.findIndex((email) => email.id === id)
    if (index >= 0) {
      this.emails.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Delete all emails from the store
   */
  async deleteAll(): Promise<number> {
    const count = this.emails.length
    this.emails = []
    return count
  }

  /**
   * Filter emails by query criteria
   */
  async filter(query: StorageQuery): Promise<Email[]> {
    return filterEmails(this.emails, query)
  }

  /**
   * Get the total count of emails
   */
  async count(): Promise<number> {
    return this.emails.length
  }

  /**
   * Initialize the storage (no-op for memory storage)
   */
  async initialize(): Promise<void> {
    // No initialization needed for in-memory storage
  }

  /**
   * Close the storage (clears all emails)
   */
  async close(): Promise<void> {
    this.emails = []
  }
}
