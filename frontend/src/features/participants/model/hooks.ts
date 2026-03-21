import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventMutationsApi } from '@/features/event-manage/api'
import { eventKeys } from '@/entities/event/queries'
import { apiFetch } from '@/shared/api/client'

type PendingInvitation = { id: string; email: string; created_at: string }

export function usePendingInvitations(eventId: string, isOrganizer: boolean) {
  return useQuery({
    queryKey: [...eventKeys.detail(eventId), 'pending'],
    queryFn: () => apiFetch<PendingInvitation[]>(`/api/events/${eventId}/participants/pending`),
    enabled: isOrganizer,
  })
}

export function useInviteParticipant(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => eventMutationsApi.inviteParticipant(eventId, email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
      qc.invalidateQueries({ queryKey: [...eventKeys.detail(eventId), 'pending'] })
    },
  })
}

export function useUpdateParticipantStatus(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'confirmed' | 'declined' }) =>
      eventMutationsApi.updateParticipantStatus(eventId, userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) }),
  })
}
