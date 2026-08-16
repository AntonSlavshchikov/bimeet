import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { chatListApi } from '@/entities/chat/api'
import { subscribeSSE } from '@/shared/api/sse'

export const chatListKeys = {
  all: ['chats'] as const,
}

// useChats fetches the chat list once, then keeps it fresh by listening for
// activity pings on /api/chats/stream (see realtime.PublishActivity on the
// backend) instead of polling.
export function useChats() {
  const qc = useQueryClient()

  useEffect(() => {
    return subscribeSSE('/api/chats/stream', {
      onEvent: type => {
        if (type === 'activity') qc.invalidateQueries({ queryKey: chatListKeys.all })
      },
    })
  }, [qc])

  const { data = [], isLoading } = useQuery({
    queryKey: chatListKeys.all,
    queryFn: chatListApi.list,
  })
  return { chats: data, isLoading }
}
