import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { parseEmailRoute, updateEmailRoute } from '../lib/emailRoute'

interface UIState {
  /** Currently selected email ID */
  selectedEmailId: string | null
  /** Current theme */
  theme: 'light' | 'dark'
  /** Search query for filtering emails */
  searchQuery: string
  /** Sidebar collapsed state */
  sidebarCollapsed: boolean
  /** Browser notifications enabled */
  notificationsEnabled: boolean
  /** Auto-show new emails when they arrive */
  autoShowNewMail: boolean
  /** Command palette open state */
  commandPaletteOpen: boolean

  // Actions
  setSelectedEmail: (id: string | null) => void
  syncSelectedEmailFromRoute: (id: string | null) => void
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setSearchQuery: (query: string) => void
  toggleSidebar: () => void
  setNotificationsEnabled: (enabled: boolean) => void
  setAutoShowNewMail: (enabled: boolean) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedEmailId: typeof window === 'undefined' ? null : parseEmailRoute(window.location.hash),
      theme: 'light',
      searchQuery: '',
      sidebarCollapsed: false,
      notificationsEnabled: false,
      autoShowNewMail: false,
      commandPaletteOpen: false,

      setSelectedEmail: (id) => {
        set({ selectedEmailId: id })
        updateEmailRoute(id)
      },

      syncSelectedEmailFromRoute: (id) => set({ selectedEmailId: id }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),

      setTheme: (theme) => set({ theme }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      setAutoShowNewMail: (enabled) => set({ autoShowNewMail: enabled }),

      openCommandPalette: () => set({ commandPaletteOpen: true }),

      closeCommandPalette: () => set({ commandPaletteOpen: false }),
    }),
    {
      name: 'maildev-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        notificationsEnabled: state.notificationsEnabled,
        autoShowNewMail: state.autoShowNewMail,
      }),
    }
  )
)
