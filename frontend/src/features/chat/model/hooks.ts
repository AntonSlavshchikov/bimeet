import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/features/chat/api'
import type { Message, MessageAuthor } from '@/entities/message/model/types'

// Chat has its own query keys (separate from eventKeys) since the feed and the
// unread badge poll independently of the event detail.
export const chatKeys = {
  messages: (id: string) => ['chat', id, 'messages'] as const,
  unread: (id: string) => ['chat', id, 'unread'] as const,
}

// useMessages polls the feed while the chat tab is mounted (`enabled`).
export function useMessages(eventId: string, enabled = true) {
  return useQuery({
    queryKey: chatKeys.messages(eventId),
    queryFn: () => chatApi.list(eventId),
    enabled: !!eventId && enabled,
    refetchInterval: enabled ? 4000 : false,
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

export function useMarkChatRead(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => chatApi.markRead(eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.unread(eventId) }),
  })
}
