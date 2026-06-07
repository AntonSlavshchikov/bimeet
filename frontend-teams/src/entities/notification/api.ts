import { apiFetch } from '@/shared/api/client'
import type { Notification } from './types'

export const notificationApi = {
  list: () => apiFetch<Notification[]>('/api/notifications'),
  markRead: (id: string) => apiFetch<void>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => apiFetch<void>('/api/notifications/read-all', { method: 'POST' }),
}
