import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

// Control the refresh state the loading bar reacts to.
const state = vi.hoisted(() => ({ isRefreshing: false }))

vi.mock('../../hooks/useSocket', () => ({ useSocket: () => undefined }))
vi.mock('../../hooks/useEmails', () => ({
  useRefreshEmails: () => ({ isRefreshing: state.isRefreshing, refresh: () => undefined }),
}))
// Stub the heavy children so we only exercise Layout's own markup.
vi.mock('./Header', () => ({ Header: () => <div data-testid="header-stub" /> }))
vi.mock('./Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar-stub" /> }))
vi.mock('../email-viewer/EmailViewer', () => ({ EmailViewer: () => <div data-testid="viewer-stub" /> }))

import { Layout } from './Layout'
import { useUIStore } from '../../stores/ui'

afterEach(() => {
  cleanup()
  state.isRefreshing = false
  useUIStore.setState({ loadingBarEnabled: true })
})

describe('Layout loading bar', () => {
  it('stays mounted (but hidden) when idle, so background refreshes do not add/remove a node', () => {
    state.isRefreshing = false
    render(<Layout />)

    const bar = screen.getByTestId('loading-bar')
    expect(bar).toBeTruthy()
    expect(bar.getAttribute('data-active')).toBe('false')
    expect(bar.className).toContain('opacity-0')
  })

  it('becomes visible via opacity (not remount) while refreshing', () => {
    state.isRefreshing = true
    render(<Layout />)

    const bar = screen.getByTestId('loading-bar')
    expect(bar.getAttribute('data-active')).toBe('true')
    expect(bar.className).toContain('opacity-100')
  })

  it('is removed entirely when disabled in settings', () => {
    useUIStore.setState({ loadingBarEnabled: false })
    render(<Layout />)

    expect(screen.queryByTestId('loading-bar')).toBeNull()
  })
})
