import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Reply, Send, Trash2, X } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import type { Message } from '@/entities/message/model/types'
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
  const [replyTo, setReplyTo] = useState<Message | null>(null)
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
    sendMessage.mutate({ body, replyTo: replyTo ?? undefined })
    setReplyTo(null)
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
                    {m.reply_to && (
                      <div
                        className={cn(
                          'mb-1 border-l-2 pl-2 text-[12px] rounded-r',
                          mine ? 'border-white/60 text-white/85' : 'border-accent text-ink-3',
                        )}
                      >
                        <span className="font-semibold">{m.reply_to.author_name}</span>
                        <span className="block truncate">
                          {m.reply_to.deleted ? t('chat.deleted', 'Сообщение удалено') : m.reply_to.body}
                        </span>
                      </div>
                    )}
                    {m.deleted ? t('chat.deleted', 'Сообщение удалено') : m.body}
                  </div>
                </div>
                {!m.deleted && (
                  <div className="self-center flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      type="button"
                      aria-label={t('chat.reply', 'Ответить')}
                      onClick={() => setReplyTo(m)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-ink-3 hover:bg-hover hover:text-ink"
                    >
                      <Reply size={13} />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        aria-label={t('chat.delete', 'Удалить сообщение')}
                        onClick={() => deleteMessage.mutate(m.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-ink-3 hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-line-soft pt-3 flex flex-col gap-2">
        {replyTo && (
          <div className="flex items-center gap-2 rounded-[8px] bg-bg-2 border-l-2 border-accent px-2.5 py-1.5">
            <Reply size={13} className="text-accent shrink-0" />
            <div className="min-w-0 flex-1 text-[12px]">
              <span className="font-semibold text-ink">
                {t('chat.replyingTo', 'Ответ')} {replyTo.author.name}
              </span>
              <span className="block truncate text-ink-3">
                {replyTo.deleted ? t('chat.deleted', 'Сообщение удалено') : replyTo.body}
              </span>
            </div>
            <button
              type="button"
              aria-label={t('common.cancel', 'Отмена')}
              onClick={() => setReplyTo(null)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={t('chat.placeholder', 'Написать сообщение…')}
            className="flex-1 resize-none min-h-[44px] max-h-[140px] py-2.5 leading-[1.4]"
          />
          <Button
            onClick={submit}
            disabled={!text.trim() || sendMessage.isPending}
            aria-label={t('chat.send', 'Отправить')}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
