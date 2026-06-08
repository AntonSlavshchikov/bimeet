export interface MessageAuthor {
  id: string
  name: string
  email: string
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
  reply_to?: ReplyPreview | null
}
