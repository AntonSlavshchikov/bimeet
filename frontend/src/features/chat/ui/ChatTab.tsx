import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useAuth } from '@/features/auth/model/AuthContext'
import {
  useMessages,
  useSendMessage,
  useDeleteMessage,
  useMarkChatRead,
} from '@/features/chat/model/hooks'
import { formatTime } from '@/shared/lib/formatDate'
import { Avatar, Button, Textarea } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function ChatTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const me = user ? { id: user.id, name: user.name, email: user.email } : undefined

  const { data: messages, isLoading } = useMessages(event.id)
  const sendMessage = useSendMessage(event.id, me)
  const deleteMessage = useDeleteMessage(event.id)
  const markRead = useMarkChatRead(event.id)

  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastId = messages?.[messages.length - 1]?.id

  // Scroll to newest and clear the unread badge whenever the feed grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
    if (event.id) markRead.mutate()
    // markRead.mutate is stable; depend on the latest message + event only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, event.id])

  const isOrganizer = event.organizer.id === user?.id

  function submit() {
    const body = text.trim()
    if (!body || sendMessage.isPending) return
    setText('')
    sendMessage.mutate(body)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        {t('chat.sectionTitle', 'Чат встречи')}
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
        {isLoading ? (
          <p className="text-[13px] text-ink-3 py-8 text-center">{t('common.loading', 'Загрузка…')}</p>
        ) : !messages || messages.length === 0 ? (
          <div className="rounded-[12px] border border-line bg-surface py-12 px-4 flex flex-col items-center gap-2">
            <MessageCircle size={26} className="text-ink-3" />
            <p className="text-[13px] text-ink-3">{t('chat.empty', 'Сообщений пока нет. Начните общение!')}</p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.author.id === user?.id
            const canDelete = !m.deleted && (mine || isOrganizer)
            return (
              <div key={m.id} className={cn('flex gap-2.5 group', mine && 'flex-row-reverse')}>
                <Avatar name={m.author.name} size="sm" className="shrink-0 mt-0.5" />
                <div className={cn('flex flex-col gap-1 min-w-0 max-w-[80%]', mine && 'items-end')}>
                  <div className={cn('flex items-center gap-2', mine && 'flex-row-reverse')}>
                    <span className="text-[12.5px] font-semibold text-ink">{mine ? t('chat.you', 'Вы') : m.author.name}</span>
                    <span className="text-[11px] text-ink-3 tnum">{formatTime(m.created_at)}</span>
                  </div>
                  <div
                    className={cn(
                      'rounded-[12px] px-3 py-2 text-[13.5px] whitespace-pre-wrap break-words',
                      m.deleted
                        ? 'italic text-ink-3 bg-bg-2 border border-line-soft'
                        : mine
                          ? 'bg-accent text-white'
                          : 'bg-bg-2 text-ink',
                    )}
                  >
                    {m.deleted ? t('chat.deleted', 'Сообщение удалено') : m.body}
                  </div>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    aria-label={t('chat.delete', 'Удалить сообщение')}
                    onClick={() => deleteMessage.mutate(m.id)}
                    className="self-center opacity-0 group-hover:opacity-100 transition inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-ink-3 hover:bg-danger/10 hover:text-danger shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-line-soft pt-3">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={t('chat.placeholder', 'Написать сообщение…')}
          className="flex-1 resize-none min-h-[40px] max-h-[120px]"
        />
        <Button onClick={submit} disabled={!text.trim() || sendMessage.isPending} aria-label={t('chat.send', 'Отправить')}>
          <Send size={15} />
        </Button>
      </div>
    </div>
  )
}
