import { EventEmitter } from 'node:events'
import type {
  Email,
  Storage,
  StorageOptions,
  StorageQuery,
  StorageStats,
} from '../types/index.js'
import { filterEmails } from '../utils/filter.js'

/**
 * In-memory storage implementation
 *
 * Emails are held in an insertion-ordered Map, so lookup, save and delete are
 * all O(1) and the oldest email is always the first entry — which is what makes
 * `maxEmails` eviction cheap.
 *
 * Emits `add`, `delete` and `clear`.
 */
export class MemoryStorage extends EventEmitter implements Storage {
  readonly options: StorageOptions
  /** Insertion-ordered, so the first entry is always the oldest email */
  protected emails = new Map<string, Email>()
  /** Kept in sync on every mutation so `stats()` never has to scan */
  private unreadCount = 0

  constructor(options: StorageOptions = {}) {
    super()
    this.options = {
      maxEmails: 0,
      ...options,
    }
  }

  /**
   * Get all emails in the store
   *
   * Materialises the entire store; use sparingly for anything that faces a user.
   */
  async getAll(): Promise<Email[]> {
    return [...this.emails.values()]
  }

  /**
   * Get a single email by ID
   */
  async getById(id: string): Promise<Email | undefined> {
    return this.emails.get(id)
  }

  /**
   * Save an email to the store
   * If maxEmails is set and exceeded, removes oldest emails
   */
  async save(email: Email): Promise<void> {
    const existing = this.emails.get(email.id)

    if (existing) {
      // Re-setting an existing key keeps its position, so updates (marking an
      // email read, say) never disturb the arrival ordering.
      if (existing.read !== email.read) {
        this.unreadCount += email.read ? -1 : 1
      }
      this.emails.set(email.id, email)
      return
    }

    this.emails.set(email.id, email)
    if (!email.read) {
      this.unreadCount++
    }
    this.emit('add', email)

    // Enforce maxEmails by dropping the oldest entries. Iteration order is
    // insertion order, so the first entries walked are the oldest.
    const max = this.options.maxEmails ?? 0
    if (max > 0) {
      for (const [id, oldest] of this.emails) {
        if (this.emails.size <= max) {
          break
        }
        this.emails.delete(id)
        if (!oldest.read) {
          this.unreadCount--
        }
      }
    }
  }

  /**
   * Delete an email by ID
   */
  async delete(id: string): Promise<boolean> {
    const email = this.emails.get(id)
    if (!email) {
      return false
    }

    this.emails.delete(id)
    if (!email.read) {
      this.unreadCount--
    }
    this.emit('delete', id)

    return true
  }

  /**
   * Delete all emails from the store
   */
  async deleteAll(): Promise<number> {
    const count = this.emails.size
    this.emails.clear()
    this.unreadCount = 0
    this.emit('clear')
    return count
  }

  /**
   * Mark every unread email as read in a single pass
   */
  async markAllRead(): Promise<number> {
    if (this.unreadCount === 0) {
      return 0
    }

    let count = 0
    for (const email of this.emails.values()) {
      if (!email.read) {
        email.read = true
        count++
      }
    }
    this.unreadCount = 0

    return count
  }

  /**
   * Filter emails by query criteria
   */
  async filter(query: StorageQuery): Promise<Email[]> {
    return filterEmails([...this.emails.values()], query)
  }

  /**
   * Get the total count of emails
   */
  async count(): Promise<number> {
    return this.emails.size
  }

  /**
   * Get total and unread counts without loading any emails
   */
  async stats(): Promise<StorageStats> {
    return { total: this.emails.size, unread: this.unreadCount }
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
    this.emails.clear()
    this.unreadCount = 0
  }
}
