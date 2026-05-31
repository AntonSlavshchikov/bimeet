import { apiFetch } from '@/shared/api/client'
import type { User, ProfileStats } from '@/entities/user/model/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export interface AuthResponse {
  token: string
  user: User
}

export interface UpdateProfileData {
  name: string
  last_name: string
  birth_date: string
  city: string
}

export const authApi = {
  requestCode: (email: string) =>
    apiFetch<{ status: string }>('/api/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyCode: (email: string, code: string) =>
    apiFetch<AuthResponse>('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  getMe: () =>
    apiFetch<User>('/api/auth/me'),
  updateProfile: (data: UpdateProfileData) =>
    apiFetch<User>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getStats: () =>
    apiFetch<ProfileStats>('/api/auth/me/stats'),
  uploadAvatar: async (file: File): Promise<User> => {
    const token = localStorage.getItem('token')
    const form = new FormData()
    form.append('avatar', file)
    const res = await fetch(`${API_URL}/api/auth/me/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!res.ok) {
      if (res.status === 401 && token) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
      const body = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    return res.json()
  },
  deleteAvatar: () =>
    apiFetch<User>('/api/auth/me/avatar', { method: 'DELETE' }),
}
