import { apiFetch } from '@/shared/api/client'
import type {
  CreateEventData,
  EventDetail,
  EventListItem,
  LinkInfo,
  PollInfo,
  UpdateEventData,
} from './types'

export const eventApi = {
  list: () => apiFetch<EventListItem[]>('/api/events'),
  get: (id: string) => apiFetch<EventDetail>(`/api/events/${id}`),
  create: (data: CreateEventData) =>
    apiFetch<EventDetail>('/api/events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UpdateEventData) =>
    apiFetch<EventDetail>(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<void>(`/api/events/${id}`, { method: 'DELETE' }),
  complete: (id: string) => apiFetch<{ status: string }>(`/api/events/${id}/complete`, { method: 'POST' }),

  // Participants
  invite: (id: string, email: string) =>
    apiFetch<{ status: string }>(`/api/events/${id}/participants`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  setMyStatus: (id: string, status: 'confirmed' | 'declined') =>
    apiFetch<{ status: string }>(`/api/events/${id}/participants/me`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Links
  createLink: (id: string, title: string, url: string) =>
    apiFetch<LinkInfo>(`/api/events/${id}/links`, {
      method: 'POST',
      body: JSON.stringify({ title, url }),
    }),
  deleteLink: (id: string, linkId: string) =>
    apiFetch<void>(`/api/events/${id}/links/${linkId}`, { method: 'DELETE' }),

  // Polls
  createPoll: (id: string, question: string, options: string[]) =>
    apiFetch<PollInfo>(`/api/events/${id}/polls`, {
      method: 'POST',
      body: JSON.stringify({ question, options }),
    }),
  vote: (id: string, pollId: string, optionId: string) =>
    apiFetch<{ status: string }>(`/api/events/${id}/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ option_id: optionId }),
    }),
}
