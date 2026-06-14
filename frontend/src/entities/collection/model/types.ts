import type { EventUser } from '@/entities/user/model/types'

export interface CollectionContribution {
  id?: string // absent until a contribution row exists for the member
  user: EventUser
  paid: boolean
  paid_at?: string
  status: 'not_paid' | 'pending' | 'paid'
  receipt_url?: string
}

export interface Collection {
  id: string
  title: string
  per_person_amount: number
  created_by: string
  created_at: string
  contributions: CollectionContribution[]
}
