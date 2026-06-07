import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventApi } from '@/entities/event/api'
import { eventKeys } from '@/entities/event/queries'

// Mutations scoped to a single event's detail view (participants / links /
// polls). All invalidate the event's detail so the enriched view refreshes.
export function useEventDetailMutations(eventId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) })

  const inviteParticipant = useMutation({
    mutationFn: (email: string) => eventApi.invite(eventId, email),
    onSuccess: invalidate,
  })
  const setMyStatus = useMutation({
    mutationFn: (status: 'confirmed' | 'declined') => eventApi.setMyStatus(eventId, status),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: eventKeys.list() })
    },
  })
  const createLink = useMutation({
    mutationFn: ({ title, url }: { title: string; url: string }) =>
      eventApi.createLink(eventId, title, url),
    onSuccess: invalidate,
  })
  const deleteLink = useMutation({
    mutationFn: (linkId: string) => eventApi.deleteLink(eventId, linkId),
    onSuccess: invalidate,
  })
  const createPoll = useMutation({
    mutationFn: ({ question, options }: { question: string; options: string[] }) =>
      eventApi.createPoll(eventId, question, options),
    onSuccess: invalidate,
  })
  const vote = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      eventApi.vote(eventId, pollId, optionId),
    onSuccess: invalidate,
  })

  return { inviteParticipant, setMyStatus, createLink, deleteLink, createPoll, vote }
}
