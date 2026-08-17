import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import { useChats } from '@/entities/chat/queries'
import ChatListItem from '@/features/chat-list/ui/ChatListItem'

interface ChatListPanelProps {
  /** event_id открытого сейчас чата — подсвечивает соответствующую строку. */
  activeEventId?: string
}

export default function ChatListPanel({ activeEventId }: ChatListPanelProps) {
  const { t } = useTranslation()
  const { chats, isLoading } = useChats()

  if (!isLoading && chats.length === 0) {
    return (
      <div className="rounded-[12px] border border-line bg-surface py-14 px-4 flex flex-col items-center gap-3">
        <MessageCircle size={28} className="text-ink-3" />
        <div className="text-[13.5px] text-ink-3">
          {t('chats.empty', 'Пока нет ни одной беседы')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {chats.map(chat => (
        <ChatListItem key={chat.event_id} chat={chat} active={chat.event_id === activeEventId} />
      ))}
    </div>
  )
}
