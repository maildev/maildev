import { push } from 'svelte-spa-router'
import { api } from './api'
import { socket } from './socket'
import { setUnreadCount } from './favicon'
import { notify, notificationsSupported, requestPermission } from './notifications'
import { defaultSettings, loadSettings, saveSettings } from './settings'
import type { DeleteMailEvent, Email, Settings } from './types'

const NEW_MAIL_DEBOUNCE_MS = 200
const NOTIFICATION_RATE_LIMIT_MS = 2000

class MailStore {
  emails = $state<Map<string, Email>>(new Map())
  selectedId = $state<string | null>(null)
  isLoading = $state(false)
  loadError = $state<string | null>(null)
  searchTerm = $state('')
  settings = $state<Settings>({ ...defaultSettings })
  socketConnected = $state(false)

  private autoShowTimer: ReturnType<typeof setTimeout> | null = null
  private notificationLockUntil = 0
  private pendingNewMailId: string | null = null

  ordered = $derived.by<Email[]>(() => {
    return [...this.emails.values()].sort((a, b) => {
      // newest first (matches AngularJS `orderBy:'time':!reverse`)
      const ta = new Date(a.time).getTime()
      const tb = new Date(b.time).getTime()
      return tb - ta
    })
  })

  filtered = $derived.by<Email[]>(() => {
    const q = this.searchTerm.trim().toLowerCase()
    if (!q) return this.ordered
    return this.ordered.filter(e => {
      if (e.subject?.toLowerCase().includes(q)) return true
      if (e.from?.some(a => addressMatches(a, q))) return true
      if (e.to?.some(a => addressMatches(a, q))) return true
      return false
    })
  })

  unreadCount = $derived.by<number>(() =>
    [...this.emails.values()].filter(e => !e.read).length
  )

  init(): void {
    this.settings = loadSettings()
    this.applyDarkTheme()

    socket.on('connect', () => { this.socketConnected = true })
    socket.on('disconnect', () => { this.socketConnected = false })
    socket.on('newMail', (email: Email) => this.onNewMail(email))
    socket.on('deleteMail', (event: DeleteMailEvent) => this.onDeleteMail(event))

    void this.refreshList()

    $effect.root(() => {
      $effect(() => {
        setUnreadCount(this.unreadCount)
        document.title = this.unreadCount > 0 ? `MailDev (+${this.unreadCount})` : 'MailDev'
      })
    })
  }

  async refreshList(): Promise<void> {
    this.isLoading = true
    this.loadError = null
    try {
      const list = await api.list()
      const map = new Map<string, Email>()
      for (const email of list) map.set(email.id, email)
      this.emails = map
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err)
    } finally {
      this.isLoading = false
    }
  }

  markAsRead(id: string): void {
    const email = this.emails.get(id)
    if (!email || email.read) return
    email.read = true
    // trigger reactivity by replacing the map entry
    this.emails = new Map(this.emails).set(id, email)
  }

  async markAllRead(): Promise<void> {
    try {
      await api.readAll()
      const next = new Map<string, Email>()
      for (const [id, email] of this.emails) next.set(id, { ...email, read: true })
      this.emails = next
    } catch (err) {
      window.alert(`Mark all read failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  async deleteEmail(id: string): Promise<void> {
    try {
      await api.remove(id)
      // server will emit deleteMail; UI updates via socket handler
    } catch (err) {
      window.alert(`Delete failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  async deleteAll(): Promise<void> {
    try {
      await api.removeAll()
    } catch (err) {
      window.alert(`Delete all failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch }
    saveSettings(this.settings)
    if ('darkThemeEnabled' in patch) this.applyDarkTheme()
  }

  toggleDarkTheme(): void {
    this.updateSettings({ darkThemeEnabled: !this.settings.darkThemeEnabled })
  }

  toggleAutoShow(): void {
    this.updateSettings({ autoShowEnabled: !this.settings.autoShowEnabled })
  }

  async toggleNotifications(): Promise<void> {
    if (!notificationsSupported) return
    if (this.settings.notificationsEnabled) {
      this.updateSettings({ notificationsEnabled: false })
      return
    }
    const granted = await requestPermission()
    this.updateSettings({ notificationsEnabled: granted })
    if (!granted) {
      window.alert('Unable to enable web notifications. Permission was not granted.')
    }
  }

  private applyDarkTheme(): void {
    document.documentElement.classList.toggle('dark', this.settings.darkThemeEnabled)
  }

  private onNewMail(email: Email): void {
    const next = new Map(this.emails)
    next.set(email.id, email)
    this.emails = next
    this.pendingNewMailId = email.id

    if (!this.autoShowTimer) {
      this.autoShowTimer = setTimeout(() => {
        const id = this.pendingNewMailId
        this.autoShowTimer = null
        this.pendingNewMailId = null
        if (id && this.settings.autoShowEnabled) {
          push(`/email/${encodeURIComponent(id)}`)
        }
      }, NEW_MAIL_DEBOUNCE_MS)
    }

    if (this.settings.notificationsEnabled && Date.now() >= this.notificationLockUntil) {
      this.notificationLockUntil = Date.now() + NOTIFICATION_RATE_LIMIT_MS
      notify('MailDev', {
        body: email.subject ?? '(no subject)',
        onClick: () => push(`/email/${encodeURIComponent(email.id)}`),
      })
    }
  }

  private onDeleteMail(event: DeleteMailEvent): void {
    if (event.id === 'all') {
      this.emails = new Map()
      push('/')
      return
    }

    const ordered = this.ordered
    const idx = ordered.findIndex(e => e.id === event.id)
    const next = new Map(this.emails)
    next.delete(event.id)
    this.emails = next

    if (this.selectedId === event.id) {
      if (ordered.length <= 1) {
        push('/')
      } else {
        const neighbor = ordered[idx === 0 ? 1 : idx - 1]
        push(`/email/${encodeURIComponent(neighbor.id)}`)
      }
    }
  }
}

function addressMatches(addr: { address: string; name?: string }, q: string): boolean {
  if (addr.address?.toLowerCase().includes(q)) return true
  if (addr.name?.toLowerCase().includes(q)) return true
  return false
}

export const store = new MailStore()
