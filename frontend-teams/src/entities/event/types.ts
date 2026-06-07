export interface UserInfo {
  id: string
  name: string
  email: string
}

export type ParticipantStatus = 'invited' | 'confirmed' | 'declined'

export interface ParticipantInfo {
  id: string
  user: UserInfo
  status: ParticipantStatus
}

export interface LinkInfo {
  id: string
  title: string
  url: string
  created_by: string
  created_at: string
}

export interface PollOptionInfo {
  id: string
  label: string
  votes: string[] // voter ids
}

export interface PollInfo {
  id: string
  question: string
  created_by: string
  created_at: string
  options: PollOptionInfo[]
}

export interface ChangeLogInfo {
  id: string
  changed_by: UserInfo
  field_name: string
  old_value: string
  new_value: string
  changed_at: string
}

export interface EventListItem {
  id: string
  title: string
  description: string
  date_start: string
  date_end: string
  location: string
  meeting_url: string
  status: 'active' | 'completed'
  confirmed_count: number
  organizer: UserInfo
  created_at: string
  my_status: string
  participants: ParticipantInfo[]
}

export interface EventDetail {
  id: string
  title: string
  description: string
  date_start: string
  date_end: string
  location: string
  meeting_url: string
  status: 'active' | 'completed'
  confirmed_count: number
  organizer: UserInfo
  created_at: string
  updated_at: string
  participants: ParticipantInfo[]
  links: LinkInfo[]
  polls: PollInfo[]
  change_log: ChangeLogInfo[]
}

export interface CreateEventData {
  title: string
  description: string
  date_start: string
  date_end: string
  location: string
  meeting_url: string
}

export type UpdateEventData = Partial<CreateEventData>
