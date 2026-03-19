export interface User {
  id: string
  name: string
  email: string
}

export type ParticipantStatus = 'invited' | 'confirmed' | 'declined'

export interface Participant {
  id: string
  user: User
  status: ParticipantStatus
}

export interface CollectionContribution {
  user_id: string
  paid: boolean
  paid_at?: string
}

export interface Collection {
  id: string
  title: string
  target_amount: number
  created_by: string
  created_at: string
  contributions: CollectionContribution[]
}

export interface PollOption {
  id: string
  label: string
  votes: string[] // voter user IDs
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  created_by: string
  created_at: string
}

export interface Item {
  id: string
  name: string
  assigned_to?: User | null
}

export interface Carpool {
  id: string
  driver: User
  seats_available: number
  departure_point: string
  passengers: User[]
}

export interface ChangeLogEntry {
  id: string
  changed_by: User
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
  organizer: User
  invite_token: string
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

export interface Notification {
  id: string
  event_id?: string
  type: string
  message: string
  is_read: boolean
  created_at: string
}
