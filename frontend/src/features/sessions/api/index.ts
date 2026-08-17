import { apiFetch } from '@/shared/api/client'

export interface AuthSession {
  id: string
  user_agent: string
  created_at: string
  last_seen_at: string
  expires_at: string
  current: boolean
}

export const sessionsApi = {
  list: () => apiFetch<AuthSession[]>('/api/auth/me/sessions'),
  revoke: (sessionId: string) =>
    apiFetch<void>(`/api/auth/me/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeOthers: () =>
    apiFetch<void>('/api/auth/me/sessions/others', { method: 'DELETE' }),
}
