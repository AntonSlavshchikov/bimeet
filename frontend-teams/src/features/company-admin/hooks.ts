import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyApi, type UpdateCompanyData } from '@/entities/company/api'

export const memberKeys = {
  all: ['members'] as const,
}

export function useMembers(enabled: boolean) {
  return useQuery({
    queryKey: memberKeys.all,
    queryFn: companyApi.members,
    enabled,
  })
}

export function useUpdateCompany() {
  return useMutation({
    mutationFn: (data: UpdateCompanyData) => companyApi.update(data),
  })
}

export function useInviteMember() {
  return useMutation({
    mutationFn: (email: string) => companyApi.invite(email),
  })
}

export function useSetMemberActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      companyApi.setMemberActive(userId, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.all }),
  })
}
