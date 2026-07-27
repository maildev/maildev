import { EventEmitter } from 'node:events'
import type {
  Email,
  EmailSummary,
  EvictHandler,
  ListOptions,
  ListResult,
  Storage,
  StorageOptions,
  StorageQuery,
  StorageStats,
} from '../types/index.js'
import { filterEmails, matchesSearchTerm } from '../utils/filter.js'
import { toSummary } from '../utils/summary.js'

/**
 * In-memory storage implementation
 *
 * Emails are held in an insertion-ordered Map, so lookup, save and delete are
 * all O(1) and the oldest email is always the first entry — which is what makes
 * `maxEmails` eviction cheap.
 *
 * Emits `add`, `delete` and `clear`. Emails dropped by `maxEmails` go to the
 * handlers registered with {@link MemoryStorage.onEvicted}, which `save()`
 * awaits so cleanup is finished rather than merely scheduled.
 */
export class MemoryStorage extends EventEmitter implements Storage {
  readonly options: StorageOptions
  /** Insertion-ordered, so the first entry is always the oldest email */
  protected emails = new Map<string, Email>()
  /** Kept in sync on every mutation so `stats()` never has to scan */
  private unreadCount = 0
  /** Cleanup handlers awaited before an eviction is considered complete */
  private evictHandlers = new Set<EvictHandler>()

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
   * Materialises the entire store; prefer {@link MemoryStorage.list} for
   * anything that faces a user.
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

    await this.evictOverflow()
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
   * Get a page of emails, newest first by default
   */
  async list(options: ListOptions = {}): Promise<ListResult<Email>> {
    const matched = this.match(options)
    const skip = Math.max(0, Math.trunc(options.skip ?? 0))
    const limit = Math.max(0, Math.trunc(options.limit ?? 0))
    const items = limit > 0 ? matched.slice(skip, skip + limit) : matched.slice(skip)

    return {
      items,
      total: matched.length,
      storeTotal: this.emails.size,
      unread: this.unreadCount,
      skip,
      limit,
    }
  }

  /**
   * Get a page of email summaries (same as `list`, without the bodies)
   */
  async listSummaries(options: ListOptions = {}): Promise<ListResult<EmailSummary>> {
    const result = await this.list(options)
    return { ...result, items: result.items.map(toSummary) }
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

  /**
   * Register a handler for emails dropped by the `maxEmails` limit
   */
  onEvicted(handler: EvictHandler): () => void {
    this.evictHandlers.add(handler)
    return () => {
      this.evictHandlers.delete(handler)
    }
  }

  /**
   * Hook for subclasses that persisted something alongside the email
   *
   * Called with the emails dropped to honour `maxEmails`, oldest first, before
   * the registered {@link MemoryStorage.onEvicted} handlers run.
   * @param emails - Emails that were just removed from the store
   */
  protected async onEvict(_emails: Email[]): Promise<void> {
    // Nothing to clean up for a purely in-memory store
  }

  /**
   * Drop the oldest emails until the store is back within `maxEmails`
   */
  private async evictOverflow(): Promise<void> {
    const max = this.options.maxEmails ?? 0
    if (max <= 0 || this.emails.size <= max) {
      return
    }

    // Iteration order is insertion order, so this walks oldest-first.
    const evicted: Email[] = []
    for (const email of this.emails.values()) {
      if (this.emails.size - evicted.length <= max) {
        break
      }
      evicted.push(email)
    }

    for (const email of evicted) {
      this.emails.delete(email.id)
      if (!email.read) {
        this.unreadCount--
      }
    }

    await this.onEvict(evicted)

    // Awaited, so that by the time save() resolves the email is gone from the
    // store and from disk
    for (const email of evicted) {
      for (const handler of this.evictHandlers) {
        await handler(email)
      }
    }
  }

  /**
   * Apply the search/unread filters and sort by received time
   */
  private match(options: ListOptions): Email[] {
    const search = options.search?.trim() ?? ''
    const matched: Email[] = []

    for (const email of this.emails.values()) {
      if (options.unreadOnly && email.read) {
        continue
      }
      if (search && !matchesSearchTerm(email, search)) {
        continue
      }
      matched.push(email)
    }

    // Decorate/sort/undecorate: `time` may be a string once it has been through
    // JSON, and converting inside the comparator would do it O(n log n) times.
    const direction = options.sort === 'asc' ? 1 : -1
    return matched
      .map((email) => ({ email, time: new Date(email.time).getTime() }))
      .sort((a, b) => direction * (a.time - b.time))
      .map((entry) => entry.email)
  }
}
