import { apiFetch } from '@/shared/api/client'
import type { User, ProfileStats } from '@/entities/user/model/types'

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
    const form = new FormData()
    form.append('avatar', file)
    return apiFetch<User>('/api/auth/me/avatar', {
      method: 'POST',
      body: form,
    })
  },
  deleteAvatar: () =>
    apiFetch<User>('/api/auth/me/avatar', { method: 'DELETE' }),
}
