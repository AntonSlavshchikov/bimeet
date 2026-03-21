import { useMutation, useQueryClient } from '@tanstack/react-query'
import { collectionsApi } from '@/features/collections/api'
import { eventKeys } from '@/entities/event/queries'

export function useAddCollection(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; target_amount: number }) => collectionsApi.create(eventId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
  })
}

export function useRemoveCollection(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (collectionId: string) => collectionsApi.delete(eventId, collectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
  })
}

export function useToggleContribution(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (collectionId: string) => collectionsApi.contribute(eventId, collectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
  })
}
