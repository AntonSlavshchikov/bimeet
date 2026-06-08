import { apiFetch } from '@/shared/api/client'
import type { Company } from '@/entities/company/types'
import type { User } from '@/entities/user/types'

export interface AuthResponse {
  token: string
  user: User
  company: Company
}

export interface RegisterCompanyData {
  email: string
  password: string
  name: string
  company_name: string
  // No subdomain — the backend generates it from company_name.
}

export const authApi = {
  registerCompany: (data: RegisterCompanyData) =>
    apiFetch<AuthResponse>('/api/auth/register-company', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (subdomain: string, email: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ subdomain, email, password }),
    }),

  acceptInvite: (token: string, name: string, password: string) =>
    apiFetch<AuthResponse>('/api/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token, name, password }),
    }),

  me: () => apiFetch<{ user: User; company: Company }>('/api/auth/me'),
}
