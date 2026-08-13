import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from '../stores/ui'
import { useEmailRoute } from './useEmailRoute'

describe('useEmailRoute', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/')
    useUIStore.getState().syncSelectedEmailFromRoute(null)
  })

  it('updates the route when an email is selected', () => {
    renderHook(() => useEmailRoute())

    act(() => useUIStore.getState().setSelectedEmail('email-123'))

    expect(window.location.hash).toBe('#/email/email-123')
  })

  it('updates the selection when the hash route changes', () => {
    renderHook(() => useEmailRoute())

    act(() => {
      window.history.pushState(null, '', '#/email/email-456')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(useUIStore.getState().selectedEmailId).toBe('email-456')
  })
})
