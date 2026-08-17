export interface ChatLastMessage {
  author_name: string
  is_mine: boolean
  body: string
  image_url?: string | null
  created_at: string
  deleted: boolean
}

export interface ChatSummary {
  event_id: string
  event_title: string
  is_permanent: boolean
  last_activity_at: string
  unread_count: number
  last_message?: ChatLastMessage | null
}
