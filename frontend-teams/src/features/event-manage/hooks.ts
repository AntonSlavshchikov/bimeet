import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventApi } from '@/entities/event/api'
import { eventKeys } from '@/entities/event/queries'
import type { CreateEventData, UpdateEventData } from '@/entities/event/types'

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventData) => eventApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  })
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateEventData) => eventApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  })
}

export function useDeleteEvent(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => eventApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.list() }),
  })
}

export function useCompleteEvent(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => eventApi.complete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  })
}
