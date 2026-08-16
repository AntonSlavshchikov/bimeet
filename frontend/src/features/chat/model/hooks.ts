import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/features/chat/api'
import type { Message, MessageAuthor } from '@/entities/message/model/types'
import { subscribeSSE } from '@/shared/api/sse'

// Chat has its own query keys (separate from eventKeys) since the feed and the
// unread badge update independently of the event detail.
export const chatKeys = {
  messages: (id: string) => ['chat', id, 'messages'] as const,
  unread: (id: string) => ['chat', id, 'unread'] as const,
}

// is_mine (and author.is_me) is computed server-side relative to whoever
// made the request — correct for the REST list, but the SSE push broadcasts
// one shared payload to every subscriber, so it only reflects the sender's
// own perspective. Recompute it here against the viewer's own email before
// caching, or every other participant would see their own messages as "Вы".
// (Reactions don't need this: ReactionSummary.reactors is viewer-neutral by
// construction, so every recipient of the same SSE payload derives its own
// "did I react" locally instead of trusting a baked-in bool.)
function withViewerPerspective(msg: Message, myEmail: string | undefined): Message {
  const isMine = !!myEmail && msg.author.email === myEmail
  return { ...msg, is_mine: isMine, author: { ...msg.author, is_me: isMine } }
}

// useMessages loads the feed once, then stays live via SSE (see
// realtime.PublishMessage on the backend) — no polling. A pushed message
// upserts by id: a new message appends, but a reaction toggle or edit on an
// existing message replaces it in place instead of jumping it to the bottom.
export function useMessages(eventId: string, myEmail: string | undefined, enabled = true) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!enabled || !eventId) return
    return subscribeSSE(`/api/events/${eventId}/stream`, {
      onEvent: (type, data) => {
        if (type !== 'message') return
        const msg = withViewerPerspective(JSON.parse(data) as Message, myEmail)
        qc.setQueryData<Message[]>(chatKeys.messages(eventId), prev => {
          const withoutTemp = (prev ?? []).filter(m => !m.id.startsWith('temp-'))
          const idx = withoutTemp.findIndex(m => m.id === msg.id)
          if (idx === -1) return [...withoutTemp, msg]
          const next = [...withoutTemp]
          next[idx] = msg
          return next
        })
      },
    })
  }, [eventId, myEmail, enabled, qc])

  return useQuery({
    queryKey: chatKeys.messages(eventId),
    queryFn: () => chatApi.list(eventId),
    enabled: !!eventId && enabled,
  })
}

// useLoadOlderMessages fetches the page before the oldest message currently
// cached and prepends it. Returns { fetched, hasMore } so callers can stop
// requesting once the server returns an empty page (start of history).
export function useLoadOlderMessages(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const current = (qc.getQueryData<Message[]>(chatKeys.messages(eventId)) ?? [])
        .filter(m => !m.id.startsWith('temp-'))
      const oldest = current[0]
      if (!oldest) return { fetched: [] as Message[], hasMore: false }
      const page = await chatApi.list(eventId, oldest.created_at)
      if (page.length) {
        const existingIds = new Set(current.map(m => m.id))
        const newOnes = page.filter(m => !existingIds.has(m.id))
        qc.setQueryData<Message[]>(chatKeys.messages(eventId), prev => [...newOnes, ...(prev ?? [])])
      }
      return { fetched: page, hasMore: page.length > 0 }
    },
  })
}

export function useChatUnread(eventId: string, enabled = true) {
  return useQuery({
    queryKey: chatKeys.unread(eventId),
    queryFn: () => chatApi.unreadCount(eventId),
    enabled: !!eventId && enabled,
    refetchInterval: 30_000,
    select: d => d.count,
  })
}

interface SendVars {
  body: string
  replyTo?: Message
}

// useSendMessage optimistically appends the message (with its reply quote) so the
// sender sees it instantly, rolling back on error and reconciling on settle.
export function useSendMessage(eventId: string, me: MessageAuthor | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, replyTo }: SendVars) => chatApi.send(eventId, body, replyTo?.id),
    onMutate: async ({ body, replyTo }: SendVars) => {
      await qc.cancelQueries({ queryKey: chatKeys.messages(eventId) })
      const previous = qc.getQueryData<Message[]>(chatKeys.messages(eventId))
      if (me) {
        const optimistic: Message = {
          id: `temp-${Date.now()}`,
          event_id: eventId,
          author: me,
          body,
          created_at: new Date().toISOString(),
          deleted: false,
          is_mine: true,
          reply_to: replyTo
            ? {
                id: replyTo.id,
                author_name: replyTo.author.name,
                body: replyTo.deleted ? '' : replyTo.body,
                deleted: replyTo.deleted,
              }
            : null,
        }
        qc.setQueryData<Message[]>(chatKeys.messages(eventId), [...(previous ?? []), optimistic])
      }
      return { previous }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(chatKeys.messages(eventId), ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: chatKeys.messages(eventId) })
      qc.invalidateQueries({ queryKey: chatKeys.unread(eventId) })
    },
  })
}

export function useSendImageMessage(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, caption }: { file: File; caption?: string }) =>
      chatApi.sendImage(eventId, file, caption),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.messages(eventId) })
      qc.invalidateQueries({ queryKey: chatKeys.unread(eventId) })
    },
  })
}

export function useDeleteMessage(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) => chatApi.remove(eventId, messageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.messages(eventId) }),
  })
}

// useToggleReaction flips the caller's reaction optimistically (instant
// feedback), then reconciles with the server response — which also arrives
// via SSE to every other viewer, so no separate invalidate is needed here.
export function useToggleReaction(eventId: string, myEmail: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      chatApi.toggleReaction(eventId, messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      await qc.cancelQueries({ queryKey: chatKeys.messages(eventId) })
      const previous = qc.getQueryData<Message[]>(chatKeys.messages(eventId))
      qc.setQueryData<Message[]>(chatKeys.messages(eventId), prev =>
        (prev ?? []).map(m => {
          if (m.id !== messageId || !myEmail) return m
          const reactions = m.reactions ?? []
          const existing = reactions.find(r => r.emoji === emoji)
          const mine = !!existing?.reactors.includes(myEmail)
          const nextReactions = existing
            ? existing.count === 1 && mine
              ? reactions.filter(r => r.emoji !== emoji)
              : reactions.map(r => r.emoji === emoji
                  ? { ...r, count: mine ? r.count - 1 : r.count + 1, reactors: mine ? r.reactors.filter(e => e !== myEmail) : [...r.reactors, myEmail] }
                  : r)
            : [...reactions, { emoji, count: 1, reactors: [myEmail] }]
          return { ...m, reactions: nextReactions }
        }),
      )
      return { previous }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(chatKeys.messages(eventId), ctx.previous)
    },
    onSuccess: updated => {
      qc.setQueryData<Message[]>(chatKeys.messages(eventId), prev =>
        (prev ?? []).map(m => m.id === updated.id ? updated : m),
      )
    },
  })
}

export function useMarkChatRead(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => chatApi.markRead(eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.unread(eventId) }),
  })
}
