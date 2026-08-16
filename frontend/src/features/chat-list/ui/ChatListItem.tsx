import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Image as ImageIcon } from 'lucide-react'
import type { ChatSummary } from '@/entities/chat/model/types'
import { chatListTimestamp } from '@/shared/lib/formatDate'
import { Avatar } from '@/shared/ui/avatar'
import { cn } from '@/shared/lib/cn'

interface ChatListItemProps {
  chat: ChatSummary
  active?: boolean
}

export default function ChatListItem({ chat, active }: ChatListItemProps) {
  const { t } = useTranslation()
  const lm = chat.last_message

  let preview: React.ReactNode = t('chats.noMessages', 'Нет сообщений')
  if (lm) {
    const prefix = lm.is_mine ? `${t('chats.you', 'Вы')}: ` : lm.author_name ? `${lm.author_name}: ` : ''
    if (lm.deleted) {
      preview = `${prefix}${t('chats.messageDeleted', 'Сообщение удалено')}`
    } else if (lm.image_url) {
      preview = (
        <span className="inline-flex items-center gap-1">
          <ImageIcon size={12} className="shrink-0" />
          {prefix}{t('chats.photo', 'Фото')}
        </span>
      )
    } else {
      preview = `${prefix}${lm.body}`
    }
  }

  return (
    <Link
      to={`/chats/${chat.event_id}`}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition',
        active ? 'bg-hover' : 'hover:bg-hover',
      )}
    >
      <Avatar name={chat.event_title} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-ink truncate">
            {chat.event_title}
          </span>
          <span className="text-[11.5px] text-ink-3 tnum shrink-0">
            {chatListTimestamp(chat.last_activity_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[13px] text-ink-3 truncate">{preview}</span>
          {chat.unread_count > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-accent text-white text-[11px] font-semibold tnum">
              {chat.unread_count > 99 ? '99+' : chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
