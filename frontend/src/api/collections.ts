import { apiFetch } from './client'

export const collectionsApi = {
  list: (eventId: string) => apiFetch<unknown[]>(`/api/events/${eventId}/collections`),
  create: (eventId: string, data: { title: string; target_amount: number }) =>
    apiFetch<unknown>(`/api/events/${eventId}/collections`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (eventId: string, collectionId: string) =>
    apiFetch<void>(`/api/events/${eventId}/collections/${collectionId}`, { method: 'DELETE' }),
  contribute: (eventId: string, collectionId: string) =>
    apiFetch<unknown>(`/api/events/${eventId}/collections/${collectionId}/contribute`, { method: 'PATCH' }),
  summary: (eventId: string) => apiFetch<unknown>(`/api/events/${eventId}/collections/summary`),
}
