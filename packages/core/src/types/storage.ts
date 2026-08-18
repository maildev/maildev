import type { Email } from './email.js'

/**
 * Query object for filtering emails
 * Supports dot-notation for nested properties (e.g., "from.address")
 */
export interface StorageQuery {
  [key: string]: unknown
}

/**
 * Options for configuring storage backends
 */
export interface StorageOptions {
  /** Directory for storing .eml files (FileStorage only) */
  mailDirectory?: string
  /**
   * Maximum number of emails to keep (0 = unlimited)
   *
   * Once the limit is reached, saving a new email drops the oldest one. File
   * backed storage deletes its .eml file and attachments at the same time, so
   * the mail directory stays bounded too.
   */
  maxEmails?: number
}

/**
 * Sort direction for listings, applied to the email's received time
 */
export type SortOrder = 'asc' | 'desc'

/**
 * Options for a paginated listing
 */
export interface ListOptions {
  /** Number of matching emails to skip */
  skip?: number
  /** Maximum emails to return (0 or omitted = no limit) */
  limit?: number
  /** Sort by received time. Defaults to 'desc' (newest first) */
  sort?: SortOrder
  /** Case-insensitive substring match on subject, addresses and body text */
  search?: string
  /** Restrict the listing to unread emails */
  unreadOnly?: boolean
}

/**
 * A page of results, plus the counts a UI needs to render pagination
 */
export interface ListResult<T> {
  /** The requested page */
  items: T[]
  /** Emails matching the query, ignoring skip/limit */
  total: number
  /** Emails in the store, ignoring the query */
  storeTotal: number
  /** Unread emails in the store, ignoring the query */
  unread: number
  /** The skip that was applied */
  skip: number
  /** The limit that was applied (0 = no limit) */
  limit: number
}

/**
 * Summary counts for the whole store
 */
export interface StorageStats {
  /** Total emails held */
  total: number
  /** How many of them are unread */
  unread: number
}

/**
 * Storage interface for email persistence
 * Implementations: MemoryStorage, FileStorage
 */
export interface Storage {
  /** Storage configuration options */
  readonly options: StorageOptions

  // CRUD Operations

  /**
   * Get all emails in the store
   * @returns Array of all stored emails
   */
  getAll(): Promise<Email[]>

  /**
   * Get a single email by ID
   * @param id - Email ID
   * @returns The email if found, undefined otherwise
   */
  getById(id: string): Promise<Email | undefined>

  /**
   * Save an email to the store
   * @param email - Email to save
   */
  save(email: Email): Promise<void>

  /**
   * Delete an email by ID
   * @param id - Email ID to delete
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>

  /**
   * Delete all emails from the store
   * @returns Number of emails deleted
   */
  deleteAll(): Promise<number>

  /**
   * Mark every unread email as read in a single pass
   * @returns Number of emails that changed from unread to read
   */
  markAllRead(): Promise<number>

  // Query Operations

  /**
   * Filter emails by query criteria
   * @param query - Query object with dot-notation support
   * @returns Array of matching emails
   */
  filter(query: StorageQuery): Promise<Email[]>

  /**
   * Get a page of emails, newest first by default
   *
   * Prefer this over {@link Storage.getAll} for anything user facing: it keeps
   * the work proportional to the page size rather than the size of the store.
   * @param options - Pagination, sorting and search options
   */
  list(options?: ListOptions): Promise<ListResult<Email>>

  /**
   * Get the total count of emails
   * @returns Number of stored emails
   */
  count(): Promise<number>

  /**
   * Get total and unread counts without loading any emails
   */
  stats(): Promise<StorageStats>

  // Eviction

  /**
   * Register a handler for emails dropped by the `maxEmails` limit
   *
   * This is how files written for an email get deleted at the moment the store
   * forgets about it, which is what keeps the mail directory bounded.
   * @param handler - Called with each evicted email; awaited by `save()`
   * @returns Function that unregisters the handler
   */
  onEvicted(handler: EvictHandler): () => void

  // Lifecycle

  /**
   * Initialize the storage (load from disk, create directories, etc.)
   */
  initialize(): Promise<void>

  /**
   * Close the storage (cleanup resources)
   */
  close(): Promise<void>
}

/**
 * Event types emitted by storage implementations
 */
export interface StorageEvents {
  /** Emitted when an email is added */
  add: (email: Email) => void
  /** Emitted when an email is deleted */
  delete: (id: string) => void
  /** Emitted when all emails are deleted */
  clear: () => void
}

/**
 * Called with an email that was dropped to stay within `maxEmails`
 *
 * Whoever wrote files for the email cleans them up here. `save()` awaits the
 * handler, so once it resolves the email is gone from both the store and disk.
 */
export type EvictHandler = (email: Email) => Promise<void> | void
