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
  register: (name: string, email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
}
