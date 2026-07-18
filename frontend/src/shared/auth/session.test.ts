import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, getSessionToken, readSession, writeSession } from './session'

const USER = { id: 'u1', email: 'user@example.com' }

describe('session storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('stores a regular session only for the current tab', () => {
    writeSession('session-token', USER, false)

    expect(readSession()).toEqual({ token: 'session-token', user: USER, rememberMe: false })
    expect(sessionStorage.getItem('token')).toBe('session-token')
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('stores a remembered session in localStorage', () => {
    writeSession('local-token', USER, true)

    expect(readSession()).toEqual({ token: 'local-token', user: USER, rememberMe: true })
    expect(localStorage.getItem('token')).toBe('local-token')
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('prefers a complete sessionStorage pair over localStorage', () => {
    localStorage.setItem('token', 'local-token')
    localStorage.setItem('user', JSON.stringify(USER))
    sessionStorage.setItem('token', 'session-token')
    sessionStorage.setItem('user', JSON.stringify({ ...USER, id: 'u2' }))

    expect(getSessionToken()).toBe('session-token')
    expect(readSession()?.rememberMe).toBe(false)
  })

  it('falls back to a legacy localStorage session when the tab pair is incomplete', () => {
    sessionStorage.setItem('token', 'orphan-token')
    localStorage.setItem('token', 'legacy-token')
    localStorage.setItem('user', JSON.stringify(USER))

    expect(readSession()).toEqual({ token: 'legacy-token', user: USER, rememberMe: true })
  })

  it('clearSession removes both session variants', () => {
    for (const storage of [sessionStorage, localStorage]) {
      storage.setItem('token', 'token')
      storage.setItem('user', JSON.stringify(USER))
    }

    clearSession()

    for (const storage of [sessionStorage, localStorage]) {
      expect(storage.getItem('token')).toBeNull()
      expect(storage.getItem('user')).toBeNull()
    }
  })
})
