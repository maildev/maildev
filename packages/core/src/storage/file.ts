import { mkdir, rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { Email, StorageOptions } from '../types/index.js'
import { mapLimit } from '../utils/concurrency.js'
import { MemoryStorage } from './memory.js'

/** Cap on concurrent filesystem operations, to stay well clear of EMFILE */
const FS_CONCURRENCY = 16

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
    const deleted = await super.delete(id)
    if (!deleted) {
      return false
    }

    await this.removeEmailFiles(id)

    return true
  }

  /**
   * Delete all emails and files from disk
   */
  override async deleteAll(): Promise<number> {
    const count = await super.deleteAll()

    // Clean up the mail directory
    try {
      const entries = await readdir(this.mailDirectory, { withFileTypes: true })
      const removable = entries.filter(
        (entry) => entry.isDirectory() || entry.name.endsWith('.eml')
      )

      // Bounded concurrency: a directory holding tens of thousands of emails
      // would otherwise open every handle at once.
      await mapLimit(removable, FS_CONCURRENCY, async (entry) => {
        await rm(join(this.mailDirectory, entry.name), {
          recursive: true,
          force: true,
        })
      })
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

  /**
   * Discard the files belonging to emails evicted by `maxEmails`
   *
   * Without this the store stays bounded but the mail directory does not, which
   * is what forces a manual wipe of the directory to recover.
   */
  protected override async onEvict(emails: Email[]): Promise<void> {
    await mapLimit(emails, FS_CONCURRENCY, (email) => this.removeEmailFiles(email.id))
  }

  /**
   * Remove an email's .eml file and attachment directory, if they exist
   */
  private async removeEmailFiles(id: string): Promise<void> {
    try {
      await rm(this.getEmailPath(id), { force: true })
      await rm(this.getAttachmentDirectory(id), { recursive: true, force: true })
    } catch {
      // Ignore errors if files don't exist
    }
  }
}
