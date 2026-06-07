import { apiFetch } from '@/shared/api/client'
import type { User } from '@/entities/user/types'
import type { Company, PublicCompany } from './types'

export interface UpdateCompanyData {
  name?: string
  brand_color?: string
  logo_url?: string
}

export interface InviteResult {
  email: string
  token: string
  expires_at: string
}

export const companyApi = {
  // Public — used before auth to theme the login page.
  getPublicBySubdomain: (subdomain: string) =>
    apiFetch<PublicCompany>(`/api/companies/by-subdomain/${subdomain}`),

  // Authenticated — the caller's own company.
  getMine: () => apiFetch<Company>('/api/companies/me'),

  // Owner-only management.
  update: (data: UpdateCompanyData) =>
    apiFetch<Company>('/api/companies/me', { method: 'PUT', body: JSON.stringify(data) }),
  members: () => apiFetch<User[]>('/api/companies/me/members'),
  invite: (email: string) =>
    apiFetch<InviteResult>('/api/companies/me/invitations', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  setMemberActive: (userId: string, isActive: boolean) =>
    apiFetch<User>(`/api/companies/me/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    }),
}
