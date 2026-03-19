import { apiFetch } from './client'
import type { Notification } from '../types'

export const notificationsApi = {
  list: () => apiFetch<Notification[]>('/api/notifications'),
  markRead: (id: string) => apiFetch<void>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
}
