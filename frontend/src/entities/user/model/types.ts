export interface User {
  id: string
  name: string
  last_name?: string
  email: string
  birth_date?: string
  city?: string
  avatar_url?: string
  created_at?: string
}

// EventUser is how other members appear inside an event. The real user ID is
// never sent to other participants; `is_me` lets the caller spot their own
// records (own vote, own message, own contribution, organizer badge).
export interface EventUser {
  name: string
  email: string
  is_me: boolean
}

export interface ProfileStats {
  organized: number
  participated: number
  completed: number
  upcoming: number
}

export type ParticipantStatus = 'invited' | 'confirmed' | 'declined'

export interface Participant {
  user: EventUser
  status: ParticipantStatus
  is_organizer: boolean
}
