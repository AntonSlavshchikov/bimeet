import type { EventUser } from '@/entities/user/model/types'

export interface Item {
  id: string
  name: string
  assigned_to?: EventUser | null
}
