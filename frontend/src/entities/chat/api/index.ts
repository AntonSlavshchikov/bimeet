import { apiFetch } from '@/shared/api/client'
import type { ChatSummary } from '@/entities/chat/model/types'

export const chatListApi = {
  list: () => apiFetch<ChatSummary[]>('/api/chats'),
}
