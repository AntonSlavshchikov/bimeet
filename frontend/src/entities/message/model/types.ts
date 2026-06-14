export interface MessageAuthor {
  name: string
  email: string
  is_me: boolean
}

// ReplyPreview is a lightweight snapshot of the message being replied to.
export interface ReplyPreview {
  id: string
  author_name: string
  body: string
  deleted: boolean
}

export interface Message {
  id: string
  event_id: string
  author: MessageAuthor
  body: string
  created_at: string
  deleted: boolean
  is_mine: boolean
  reply_to?: ReplyPreview | null
}
