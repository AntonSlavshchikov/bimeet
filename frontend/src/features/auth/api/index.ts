import { apiFetch } from '@/shared/api/client'
import type { User } from '@/entities/user/model/types'

export interface AuthResponse {
  token: string
  user: User
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
}
