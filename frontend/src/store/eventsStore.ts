import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '../api/events'
import { collectionsApi } from '../api/collections'
import { pollsApi } from '../api/polls'
import { itemsApi } from '../api/items'
import { carpoolsApi } from '../api/carpools'
import type { Event } from '../types'

// ─── Query hooks ─────────────────────────────────────────────────────────────

export function useEvents() {
  const { data = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
  })
  return data
}

export function useEvent(id: string) {
  const { data } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
  })
  return data as Event | undefined
}

// ─── Event mutations ─────────────────────────────────────────────────────────

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof eventsApi.update>[1]) => eventsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', id] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: eventsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

// ─── Participant mutations ────────────────────────────────────────────────────

export function useInviteParticipant(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => eventsApi.inviteParticipant(eventId, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

export function useUpdateParticipantStatus(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'confirmed' | 'declined' }) =>
      eventsApi.updateParticipantStatus(eventId, userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

// ─── Collection mutations ─────────────────────────────────────────────────────

export function useAddCollection(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; target_amount: number }) => collectionsApi.create(eventId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

export function useRemoveCollection(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (collectionId: string) => collectionsApi.delete(eventId, collectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

export function useToggleContribution(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (collectionId: string) => collectionsApi.contribute(eventId, collectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

// ─── Poll mutations ───────────────────────────────────────────────────────────

export function useAddPoll(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { question: string; options: string[] }) => pollsApi.create(eventId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

export function useVote(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      pollsApi.vote(eventId, pollId, optionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

// ─── Item mutations ───────────────────────────────────────────────────────────

export function useAddItem(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => itemsApi.create(eventId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

export function useAssignItem(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, userId }: { itemId: string; userId: string | null }) =>
      itemsApi.assign(eventId, itemId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

// ─── Carpool mutations ────────────────────────────────────────────────────────

export function useAddCarpool(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { seats_available: number; departure_point: string }) =>
      carpoolsApi.create(eventId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}

export function useJoinCarpool(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (carpoolId: string) => carpoolsApi.join(eventId, carpoolId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', eventId] }),
  })
}
