import type { EventUser } from '@/entities/user/model/types'

export interface Carpool {
  id: string
  driver: EventUser
  seats_available: number
  departure_point: string
  passengers: EventUser[]
}
