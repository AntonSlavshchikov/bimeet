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
