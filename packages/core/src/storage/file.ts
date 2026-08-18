import { mkdir, rm, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { Email, StorageOptions } from '../types/index.js'
import { MemoryStorage } from './memory.js'

/**
 * File-based storage implementation
 * Extends MemoryStorage with .eml file persistence
 */
export class FileStorage extends MemoryStorage {
  readonly mailDirectory: string

  constructor(options: StorageOptions = {}) {
    super(options)
    this.mailDirectory =
      options.mailDirectory || join(tmpdir(), `maildev-${process.pid}`)
  }

  /**
   * Initialize the storage
   * Creates the mail directory if it doesn't exist
   */
  override async initialize(): Promise<void> {
    await mkdir(this.mailDirectory, { recursive: true })
    // Future: Load existing .eml files from directory
  }

  /**
   * Save an email to the store and disk
   */
  override async save(email: Email): Promise<void> {
    // Update the source path to point to this storage's directory
    const emailWithSource: Email = {
      ...email,
      source: join(this.mailDirectory, `${email.id}.eml`),
    }

    await super.save(emailWithSource)

    // Create attachment directory if email has attachments
    if (email.attachments && email.attachments.length > 0) {
      const attachmentDir = join(this.mailDirectory, email.id)
      await mkdir(attachmentDir, { recursive: true })
    }

    // Note: Actual .eml file writing will be handled by SMTP package
    // This package provides the storage abstraction and directory management
  }

  /**
   * Delete an email and its files from disk
   */
  override async delete(id: string): Promise<boolean> {
    const email = await this.getById(id)
    if (!email) {
      return false
    }

    // Delete from memory
    const deleted = await super.delete(id)
    if (!deleted) {
      return false
    }

    // Delete .eml file and attachment directory
    try {
      await rm(join(this.mailDirectory, `${id}.eml`), { force: true })
      await rm(join(this.mailDirectory, id), { recursive: true, force: true })
    } catch {
      // Ignore errors if files don't exist
    }

    return true
  }

  /**
   * Delete all emails and files from disk
   */
  override async deleteAll(): Promise<number> {
    const count = await super.deleteAll()

    // Clean up the mail directory
    try {
      const entries = await readdir(this.mailDirectory)
      for (const entry of entries) {
        const entryPath = join(this.mailDirectory, entry)
        const entryStat = await stat(entryPath)
        if (entryStat.isDirectory() || entry.endsWith('.eml')) {
          await rm(entryPath, { recursive: true, force: true })
        }
      }
    } catch {
      // Ignore errors if directory doesn't exist
    }

    return count
  }

  /**
   * Close the storage
   * Optionally removes the mail directory
   */
  override async close(): Promise<void> {
    await super.close()
    // Note: We don't delete the mail directory on close
    // to preserve emails for future sessions
  }

  /**
   * Get the path to an email's .eml file
   */
  getEmailPath(id: string): string {
    return join(this.mailDirectory, `${id}.eml`)
  }

  /**
   * Get the path to an email's attachment directory
   */
  getAttachmentDirectory(id: string): string {
    return join(this.mailDirectory, id)
  }
}
