import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useEvent } from '@/entities/event/queries'
import ChatTab from '@/features/chat/ui/ChatTab'
import ChatListPanel from '@/features/chat-list/ui/ChatListPanel'
import { cn } from '@/shared/lib/cn'

export default function ChatsPage() {
  const { eventId } = useParams<{ eventId: string }>()

  return (
    <div className="h-full min-h-0 flex flex-col lg:flex-row lg:gap-5">
      {/* Chat list — always visible on lg+, hidden on mobile once a chat is open */}
      <div className={cn('lg:w-[320px] lg:shrink-0 lg:overflow-y-auto', eventId && 'hidden lg:block')}>
        <ChatListPanel activeEventId={eventId} />
      </div>

      {/* Conversation pane */}
      <div className={cn('flex-1 min-h-0 flex flex-col', !eventId && 'hidden lg:flex')}>
        {eventId ? (
          <Conversation eventId={eventId} />
        ) : (
          <EmptyConversation />
        )}
      </div>
    </div>
  )
}

function Conversation({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const event = useEvent(eventId)

  if (!event) return null

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-[14px] border border-line bg-surface overflow-hidden">
      <Link
        to="/chats"
        className="lg:hidden flex items-center gap-1.5 px-4 py-2.5 border-b border-line-soft text-[13px] text-ink-3 hover:text-ink transition"
      >
        <ArrowLeft size={14} /> {t('chats.backToList', 'К списку чатов')}
      </Link>
      <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6">
        <ChatTab event={event} />
      </div>
    </div>
  )
}

function EmptyConversation() {
  const { t } = useTranslation()
  return (
    <div className="flex-1 min-h-0 rounded-[14px] border border-line bg-surface flex flex-col items-center justify-center gap-3 text-ink-3">
      <MessageCircle size={32} />
      <div className="text-[13.5px]">{t('chats.selectChat', 'Выберите чат слева')}</div>
    </div>
  )
}
