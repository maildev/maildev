import { beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from './ui'

describe('ui store — loadingBarEnabled', () => {
  beforeEach(() => {
    useUIStore.setState({ loadingBarEnabled: true })
  })

  it('defaults to enabled', () => {
    expect(useUIStore.getState().loadingBarEnabled).toBe(true)
  })

  it('can be toggled off and on', () => {
    useUIStore.getState().setLoadingBarEnabled(false)
    expect(useUIStore.getState().loadingBarEnabled).toBe(false)

    useUIStore.getState().setLoadingBarEnabled(true)
    expect(useUIStore.getState().loadingBarEnabled).toBe(true)
  })
})
