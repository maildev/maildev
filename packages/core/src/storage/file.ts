import { mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import type { Email, EmailMetadata, StorageOptions } from '../types/index.js'
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
    // Reject ids that would resolve outside the mail directory before one ever
    // enters the store, so a later delete/evict can't turn it into a path that
    // escapes (e.g. `rm -rf` on a directory above mailDirectory). Ids are
    // normally 8-char alphanumeric from makeId(); a caller passing an arbitrary
    // id through the embeddable API is where this would otherwise bite.
    this.assertSafeEmailId(email.id)

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

    // Persist any post-receipt state (relay status today) in a metadata sidecar
    // so it survives a restart. The raw .eml can't carry it, so it lives beside
    // the .eml and is read back by loadMailsFromDirectory. The store routes
    // every mutation through save(), so writing the whole projection here keeps
    // the sidecar in step without needing partial updates.
    const metadata = this.buildMetadata(email)
    if (metadata) {
      await writeFile(
        this.getMetadataPath(email.id),
        JSON.stringify(metadata),
        'utf8'
      )
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
        (entry) =>
          entry.isDirectory() ||
          entry.name.endsWith('.eml') ||
          entry.name.endsWith('.meta.json')
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
    this.assertSafeEmailId(id)
    return join(this.mailDirectory, `${id}.eml`)
  }

  /**
   * Get the path to an email's attachment directory
   */
  getAttachmentDirectory(id: string): string {
    this.assertSafeEmailId(id)
    return join(this.mailDirectory, id)
  }

  /**
   * Get the path to an email's metadata sidecar
   */
  private getMetadataPath(id: string): string {
    this.assertSafeEmailId(id)
    return join(this.mailDirectory, `${id}.meta.json`)
  }

  /**
   * Project the persisted-metadata fields out of an email
   *
   * Returns null when there's nothing to persist. Each persisted field adds a
   * block here; the shape mirrors {@link EmailMetadata}.
   */
  private buildMetadata(email: Email): EmailMetadata | null {
    const metadata: EmailMetadata = {}
    if (email.relayedAt) {
      metadata.relayedAt = email.relayedAt
      metadata.relayedTo = email.relayedTo ?? []
    }
    return Object.keys(metadata).length > 0 ? metadata : null
  }

  /**
   * Read the persisted metadata for an email, if any
   *
   * Used when restoring emails from disk so state recorded in a previous
   * session (e.g. a relay) is not lost. Returns null when no sidecar exists or
   * it is unreadable.
   * @param id - Email ID
   */
  async readMetadata(id: string): Promise<EmailMetadata | null> {
    let raw: string
    try {
      raw = await readFile(this.getMetadataPath(id), 'utf8')
    } catch {
      // No sidecar: no metadata was ever recorded for this email.
      return null
    }

    try {
      const parsed = JSON.parse(raw) as { relayedAt?: string; relayedTo?: string[] }
      const metadata: EmailMetadata = {}
      if (parsed.relayedAt) {
        metadata.relayedAt = new Date(parsed.relayedAt)
        metadata.relayedTo = parsed.relayedTo ?? []
      }
      return Object.keys(metadata).length > 0 ? metadata : null
    } catch {
      // A corrupt sidecar shouldn't stop the email from being restored.
      return null
    }
  }

  /**
   * Guard against an id that would escape the mail directory
   *
   * Throws unless both `<id>.eml` and `<id>/` resolve to paths inside
   * `mailDirectory`. Permits ordinary filenames (dots included) while rejecting
   * path separators and `..` traversal, so the recursive, forced removals in
   * delete/eviction can never touch anything outside the directory.
   * @param id - Email id to validate
   */
  private assertSafeEmailId(id: string): void {
    const base = resolve(this.mailDirectory)
    const contained = (target: string): boolean =>
      target === base || target.startsWith(base + sep)

    if (!id || !contained(resolve(base, `${id}.eml`)) || !contained(resolve(base, id))) {
      throw new Error(`Unsafe email id: ${JSON.stringify(id)}`)
    }
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
      await rm(this.getMetadataPath(id), { force: true })
    } catch {
      // Ignore errors if files don't exist
    }
  }
}
