export interface MessageAuthor {
  id: string
  name: string
  email: string
}

export interface Message {
  id: string
  event_id: string
  author: MessageAuthor
  body: string
  created_at: string
  deleted: boolean
}
