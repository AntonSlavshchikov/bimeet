import type { EventUser, Participant } from '@/entities/user/model/types'
import type { Collection } from '@/entities/collection/model/types'
import type { Poll } from '@/entities/poll/model/types'
import type { Item } from '@/entities/item/model/types'
import type { Carpool } from '@/entities/carpool/model/types'

export interface ChangeLogEntry {
  id: string
  changed_by: EventUser
  field_name: string
  old_value: string
  new_value: string
  changed_at: string
}

export interface Event {
  id: string
  title: string
  description: string
  date_start: string
  date_end: string
  location: string
  location_lat?: number
  location_lng?: number
  dress_code?: string
  status: 'active' | 'completed'
  is_public: boolean
  max_guests?: number
  confirmed_count: number
  organizer: EventUser
  invite_token?: string
  invite_token_expires_at?: string
  created_at: string
  updated_at: string
  my_status?: string
  participants: Participant[]
  collections: Collection[]
  polls: Poll[]
  items: Item[]
  carpools: Carpool[]
  change_log: ChangeLogEntry[]
}

export interface EventListItem {
  id: string
  title: string
  description: string
  date_start: string
  date_end: string
  location: string
  dress_code?: string
  status: 'active' | 'completed'
  is_public: boolean
  max_guests?: number
  confirmed_count: number
  organizer: EventUser
  invite_token?: string
  invite_token_expires_at?: string
  created_at: string
  my_status: string
  participants: Array<{ user: EventUser; status: string; is_organizer: boolean }>
}

export interface PublicEventUser {
  name: string
  is_me: boolean
}

export interface PublicEventListItem {
  id: string
  title: string
  description: string
  date_start: string
  date_end: string
  location: string
  dress_code?: string
  status: 'active' | 'completed'
  is_public: boolean
  max_guests?: number
  confirmed_count: number
  organizer: PublicEventUser
  created_at: string
  my_status: string
  participants: Array<{ user: PublicEventUser; status: string; is_organizer: boolean }>
  is_participant: boolean
}

export interface InviteEventInfo {
  id: string
  title: string
  description: string
  date_start: string
  date_end: string
  location: string
  dress_code?: string
  organizer: PublicEventUser
  confirmed_count: number
}

export interface CreateEventData {
  title: string
  description: string
  date_start: string
  date_end: string
  location: string
  location_lat?: number
  location_lng?: number
  dress_code?: string
}

export interface UpdateEventData {
  title?: string
  description?: string
  date_start?: string
  date_end?: string
  location?: string
  location_lat?: number
  location_lng?: number
  dress_code?: string
}
