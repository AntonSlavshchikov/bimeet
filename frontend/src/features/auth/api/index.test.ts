import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/client', () => ({ apiFetch: vi.fn() }))

import { apiFetch } from '@/shared/api/client'
import { authApi } from './index'

describe('authApi', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forwards remember_me when verifying a code', () => {
    authApi.verifyCode('user@example.com', '123456', true)

    expect(apiFetch).toHaveBeenCalledWith('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user@example.com',
        code: '123456',
        remember_me: true,
      }),
    })
  })

  it('uploadAvatar uses a sessionStorage token', async () => {
    sessionStorage.setItem('token', 'session-token')
    sessionStorage.setItem('user', '{"id":"u1"}')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'u1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await authApi.uploadAvatar(new File(['avatar'], 'avatar.png'))

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me/avatar'),
      expect.objectContaining({ headers: { Authorization: 'Bearer session-token' } }),
    )
  })

  it('uploadAvatar clears both storages on 401', async () => {
    for (const storage of [sessionStorage, localStorage]) {
      storage.setItem('token', 'token')
      storage.setItem('user', '{"id":"u1"}')
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'expired' }),
    }))

    await expect(authApi.uploadAvatar(new File(['avatar'], 'avatar.png'))).rejects.toThrow('expired')

    for (const storage of [sessionStorage, localStorage]) {
      expect(storage.getItem('token')).toBeNull()
      expect(storage.getItem('user')).toBeNull()
    }
  })
})
