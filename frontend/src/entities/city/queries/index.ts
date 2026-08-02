import { useQuery } from '@tanstack/react-query'
import { citiesApi } from '@/entities/city/api'

export const cityKeys = {
  all: ['cities'] as const,
}

export function useCities() {
  return useQuery({
    queryKey: cityKeys.all,
    queryFn: citiesApi.list,
    staleTime: 24 * 60 * 60 * 1000,
  })
}
