import { useQuery } from '@tanstack/react-query'
import { eventApi } from './api'

// Canonical query keys — mutation hooks invalidate these. Never redefine.
export const eventKeys = {
  all: ['events'] as const,
  list: () => [...eventKeys.all, 'list'] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
}

export function useEvents() {
  return useQuery({
    queryKey: eventKeys.list(),
    queryFn: eventApi.list,
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventApi.get(id),
    enabled: Boolean(id),
  })
}
