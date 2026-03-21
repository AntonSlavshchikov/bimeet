import { apiFetch } from '@/shared/api/client'
import type { Notification } from '@/entities/notification/model/types'

export const notificationsApi = {
  list: () => apiFetch<Notification[]>('/api/notifications'),
  markRead: (id: string) => apiFetch<void>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
}
