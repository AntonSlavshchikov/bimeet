import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { passkeysApi } from '@/features/passkeys/api'
import { registerPasskey } from '@/features/passkeys/lib/webauthn'

export const passkeyKeys = {
  config: ['passkeys', 'config'] as const,
  list: ['passkeys', 'list'] as const,
}

export function usePasskeyConfig() {
  return useQuery({
    queryKey: passkeyKeys.config,
    queryFn: passkeysApi.config,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function usePasskeys(enabled = true) {
  return useQuery({
    queryKey: passkeyKeys.list,
    queryFn: passkeysApi.list,
    enabled,
    retry: false,
  })
}

export function useCreatePasskey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name?: string) => registerPasskey(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: passkeyKeys.list }),
  })
}

export function useRenamePasskey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => passkeysApi.rename(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: passkeyKeys.list }),
  })
}

export function useDeletePasskey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: passkeysApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: passkeyKeys.list }),
  })
}
