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

// reactors (not a "mine" bool) — viewer-neutral, so the same payload is
// correct whether it came from a direct fetch or an SSE broadcast to every
// participant. "Did I react" is derived client-side from the viewer's email.
export interface ReactionSummary {
  emoji: string
  count: number
  reactors: string[]
}

export interface Message {
  id: string
  event_id: string
  author: MessageAuthor
  body: string
  image_url?: string | null
  created_at: string
  deleted: boolean
  is_mine: boolean
  reply_to?: ReplyPreview | null
  reactions?: ReactionSummary[]
}
