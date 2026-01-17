import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  /** Currently selected email ID */
  selectedEmailId: string | null
  /** Current theme */
  theme: 'light' | 'dark'
  /** Search query for filtering emails */
  searchQuery: string
  /** Sidebar collapsed state */
  sidebarCollapsed: boolean

  // Actions
  setSelectedEmail: (id: string | null) => void
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setSearchQuery: (query: string) => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedEmailId: null,
      theme: 'light',
      searchQuery: '',
      sidebarCollapsed: false,

      setSelectedEmail: (id) => set({ selectedEmailId: id }),

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
    }),
    {
      name: 'maildev-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
