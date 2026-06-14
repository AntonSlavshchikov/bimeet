import { apiFetch } from '@/shared/api/client'

export const itemsApi = {
  list: (eventId: string) => apiFetch<unknown[]>(`/api/events/${eventId}/items`),
  create: (eventId: string, name: string) =>
    apiFetch<unknown>(`/api/events/${eventId}/items`, { method: 'POST', body: JSON.stringify({ name }) }),
  // assigned=true takes the item for the caller; false unassigns it.
  assign: (eventId: string, itemId: string, assigned: boolean) =>
    apiFetch<unknown>(`/api/events/${eventId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned }),
    }),
}
