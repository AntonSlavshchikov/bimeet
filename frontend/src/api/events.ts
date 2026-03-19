import { apiFetch } from './client'
import type { Event } from '../types'

export interface EventListItem {
  id: string
  title: string
  description: string
  date_start: string
  date_end: string
  location: string
  organizer: { id: string; name: string; email: string }
  invite_token: string
  created_at: string
  my_status: string
  participants: Array<{ id: string; user: { id: string; name: string; email: string }; status: string }>
}

export const eventsApi = {
  list: () => apiFetch<EventListItem[]>('/api/events'),

  getById: (id: string) => apiFetch<Event>(`/api/events/${id}`),

  create: (data: { title: string; description: string; date_start: string; date_end: string; location: string }) =>
    apiFetch<Event>('/api/events', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<{ title: string; description: string; date_start: string; date_end: string; location: string }>) =>
    apiFetch<Event>(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<void>(`/api/events/${id}`, { method: 'DELETE' }),

  inviteParticipant: (eventId: string, email: string) =>
    apiFetch(`/api/events/${eventId}/participants`, { method: 'POST', body: JSON.stringify({ email }) }),

  updateParticipantStatus: (eventId: string, userId: string, status: 'confirmed' | 'declined') =>
    apiFetch(`/api/events/${eventId}/participants/${userId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
}
