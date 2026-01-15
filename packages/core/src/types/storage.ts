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
  /** Maximum number of emails to store (0 = unlimited) */
  maxEmails?: number
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

  // Query Operations

  /**
   * Filter emails by query criteria
   * @param query - Query object with dot-notation support
   * @returns Array of matching emails
   */
  filter(query: StorageQuery): Promise<Email[]>

  /**
   * Get the total count of emails
   * @returns Number of stored emails
   */
  count(): Promise<number>

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
