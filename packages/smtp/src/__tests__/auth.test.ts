import { describe, it, expect } from 'vitest'
import { createAuthCallback, createNoAuthCallback } from '../auth.js'

describe('createAuthCallback', () => {
  const credentials = { user: 'testuser', pass: 'testpass' }

  it('should authenticate valid credentials', () => {
    const onAuth = createAuthCallback(credentials)
    const callback = (error: Error | null, result?: { user: string }) => {
      expect(error).toBeNull()
      expect(result?.user).toBe('testuser')
    }

    onAuth(
      { method: 'PLAIN', username: 'testuser', password: 'testpass' },
      { id: '1', remoteAddress: '127.0.0.1' },
      callback
    )
  })

  it('should reject invalid username', () => {
    const onAuth = createAuthCallback(credentials)
    const callback = (error: Error | null) => {
      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toBe('Invalid username or password')
    }

    onAuth(
      { method: 'PLAIN', username: 'wronguser', password: 'testpass' },
      { id: '1', remoteAddress: '127.0.0.1' },
      callback
    )
  })

  it('should reject invalid password', () => {
    const onAuth = createAuthCallback(credentials)
    const callback = (error: Error | null) => {
      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toBe('Invalid username or password')
    }

    onAuth(
      { method: 'PLAIN', username: 'testuser', password: 'wrongpass' },
      { id: '1', remoteAddress: '127.0.0.1' },
      callback
    )
  })

  it('should reject missing username', () => {
    const onAuth = createAuthCallback(credentials)
    const callback = (error: Error | null) => {
      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toBe('Username and password must be provided')
    }

    onAuth(
      { method: 'PLAIN', password: 'testpass' },
      { id: '1', remoteAddress: '127.0.0.1' },
      callback
    )
  })

  it('should reject missing password', () => {
    const onAuth = createAuthCallback(credentials)
    const callback = (error: Error | null) => {
      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toBe('Username and password must be provided')
    }

    onAuth(
      { method: 'PLAIN', username: 'testuser' },
      { id: '1', remoteAddress: '127.0.0.1' },
      callback
    )
  })
})

describe('createNoAuthCallback', () => {
  it('should reject all authentication attempts', () => {
    const onAuth = createNoAuthCallback()
    const callback = (error: Error | null) => {
      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toBe('Authentication not enabled')
    }

    onAuth(
      { method: 'PLAIN', username: 'any', password: 'any' },
      { id: '1', remoteAddress: '127.0.0.1' },
      callback
    )
  })
})
