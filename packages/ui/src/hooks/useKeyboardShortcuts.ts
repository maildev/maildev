import { useEffect, useMemo } from 'react'
import { useUIStore } from '../stores/ui'
import { useEmails, useRefreshEmails, useMarkAllRead, filterEmails } from './useEmails'
import { api } from '../lib/api'
import type { Email } from '@maildev/core'

/**
 * Global keyboard shortcuts for the application
 *
 * Shortcuts:
 * - j: Select next email
 * - k: Select previous email
 * - /: Focus search input
 * - r: Refresh emails
 * - Delete/Backspace: Delete selected email
 * - Escape: Deselect email
 * - a: Mark all as read
 * - s: Toggle sidebar
 * - ?: Open command palette (show available commands)
 */
export function useKeyboardShortcuts() {
  const { data: emails = [] } = useEmails()
  const { refresh } = useRefreshEmails()
  const markAllReadMutation = useMarkAllRead()

  const selectedEmailId = useUIStore((s) => s.selectedEmailId)
  const setSelectedEmail = useUIStore((s) => s.setSelectedEmail)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const openCommandPalette = useUIStore((s) => s.openCommandPalette)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)

  // Filter and sort emails the same way as the sidebar
  const visibleEmails = useMemo(() => {
    const filtered = filterEmails(emails as Email[], searchQuery)
    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.time).getTime()
      const timeB = new Date(b.time).getTime()
      return timeB - timeA
    })
  }, [emails, searchQuery])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle shortcuts when command palette is open
      if (commandPaletteOpen) return

      // Don't handle shortcuts when typing in an input or textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception: Escape should still work to blur the input
        if (e.key === 'Escape') {
          target.blur()
          return
        }
        return
      }

      // Don't handle if modifier keys are pressed (except for special cases)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const currentIndex = visibleEmails.findIndex((email) => email.id === selectedEmailId)

      switch (e.key) {
        case 'j': {
          // Next email (in visible/filtered list)
          e.preventDefault()
          if (visibleEmails.length > 0) {
            const nextIndex = currentIndex < visibleEmails.length - 1 ? currentIndex + 1 : 0
            setSelectedEmail(visibleEmails[nextIndex].id)
          }
          break
        }

        case 'k': {
          // Previous email (in visible/filtered list)
          e.preventDefault()
          if (visibleEmails.length > 0) {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleEmails.length - 1
            setSelectedEmail(visibleEmails[prevIndex].id)
          }
          break
        }

        case '/': {
          // Focus search
          e.preventDefault()
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder="Search emails..."]'
          )
          searchInput?.focus()
          break
        }

        case 'r': {
          // Refresh emails
          e.preventDefault()
          refresh()
          break
        }

        case 'Escape': {
          // Deselect email
          if (selectedEmailId) {
            e.preventDefault()
            setSelectedEmail(null)
          }
          break
        }

        case 'Delete':
        case 'Backspace': {
          // Delete selected email
          if (selectedEmailId) {
            e.preventDefault()
            if (window.confirm('Delete this email?')) {
              // Find next email to select before deleting (from visible list)
              const nextIndex = currentIndex < visibleEmails.length - 1 ? currentIndex + 1 : currentIndex - 1
              const nextEmail = visibleEmails[nextIndex]

              api.emails.delete(selectedEmailId).then(() => {
                setSelectedEmail(nextEmail?.id ?? null)
                refresh()
              })
            }
          }
          break
        }

        case 'a': {
          // Mark all as read
          e.preventDefault()
          markAllReadMutation.mutate()
          break
        }

        case 's': {
          // Toggle sidebar
          e.preventDefault()
          toggleSidebar()
          break
        }

        case 'c': {
          // Clear search
          e.preventDefault()
          setSearchQuery('')
          break
        }

        case '?': {
          // Open command palette to show available commands
          e.preventDefault()
          openCommandPalette()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    visibleEmails,
    selectedEmailId,
    setSelectedEmail,
    commandPaletteOpen,
    openCommandPalette,
    toggleSidebar,
    setSearchQuery,
    refresh,
    markAllReadMutation,
  ])
}
