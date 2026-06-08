import { apiFetch } from '@/shared/api/client'
import type { Message } from '@/entities/message/model/types'

export const chatApi = {
  list: (eventId: string) => apiFetch<Message[]>(`/api/events/${eventId}/messages`),
  send: (eventId: string, body: string) =>
    apiFetch<Message>(`/api/events/${eventId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  remove: (eventId: string, messageId: string) =>
    apiFetch<void>(`/api/events/${eventId}/messages/${messageId}`, { method: 'DELETE' }),
  markRead: (eventId: string) =>
    apiFetch<void>(`/api/events/${eventId}/messages/read`, { method: 'POST' }),
  unreadCount: (eventId: string) =>
    apiFetch<{ count: number }>(`/api/events/${eventId}/messages/unread-count`),
}
