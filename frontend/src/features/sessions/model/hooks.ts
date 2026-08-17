import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionsApi, type AuthSession } from '@/features/sessions/api'

export const sessionKeys = {
  all: ['auth-sessions'] as const,
}

export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: sessionsApi.list,
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sessionsApi.revoke,
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData<AuthSession[]>(sessionKeys.all, sessions =>
        sessions?.filter(session => session.id !== sessionId),
      )
    },
  })
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sessionsApi.revokeOthers,
    onSuccess: () => {
      queryClient.setQueryData<AuthSession[]>(sessionKeys.all, sessions =>
        sessions?.filter(session => session.current),
      )
    },
  })
}
