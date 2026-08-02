import { apiFetch } from '@/shared/api/client'
import type { Event, EventListItem, PublicEventListItem } from '@/entities/event/model/types'

export const eventsReadApi = {
  list: () => apiFetch<EventListItem[]>('/api/events'),
  getById: (id: string) => apiFetch<Event>(`/api/events/${id}`),
  listPublic: (cityId?: string) => {
    const query = cityId ? `?city_id=${encodeURIComponent(cityId)}` : ''
    return apiFetch<PublicEventListItem[]>(`/api/events/public${query}`)
  },
}
