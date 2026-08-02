import { apiFetch } from '@/shared/api/client'
import type { City } from '@/entities/city/model/types'

export const citiesApi = {
  list: () => apiFetch<City[]>('/api/cities'),
}
