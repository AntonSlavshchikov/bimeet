import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image as ImageIcon, MessageCircle, Reply, Send, Trash2, X } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import type { Message } from '@/entities/message/model/types'
import { useAuth } from '@/features/auth/model/AuthContext'
import {
  useMessages,
  useSendMessage,
  useSendImageMessage,
  useDeleteMessage,
  useMarkChatRead,
} from '@/features/chat/model/hooks'
import { dateGroupLabel, formatTime } from '@/shared/lib/formatDate'
import { Avatar, Button, Textarea, useToast } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

const MAX_IMAGE_SIZE = 10 << 20 // 10 MB
const GROUP_WINDOW_MS = 5 * 60 * 1000

interface FeedEntry {
  message: Message
  showHeader: boolean
  dateDivider: string | null
}

// Groups consecutive messages from the same author within a 5-minute window (no
// avatar/name repeated), and inserts a date divider whenever the calendar day changes.
function buildFeed(messages: Message[]): FeedEntry[] {
  return messages.map((m, i) => {
    const prev = messages[i - 1]
    const dateDivider = !prev || dateGroupLabel(m.created_at) !== dateGroupLabel(prev.created_at)
      ? dateGroupLabel(m.created_at)
      : null
    const sameAuthor = !!prev && prev.author.email === m.author.email && prev.is_mine === m.is_mine
    const withinWindow = !!prev && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_WINDOW_MS
    const showHeader = !dateDivider ? !(sameAuthor && withinWindow && !m.reply_to) : true
    return { message: m, showHeader, dateDivider }
  })
}

export default function ChatTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const me = user ? { name: user.name, email: user.email, is_me: true } : undefined

  const { data: messages, isLoading } = useMessages(event.id)
  const sendMessage = useSendMessage(event.id, me)
  const sendImage = useSendImageMessage(event.id)
  const deleteMessage = useDeleteMessage(event.id)
  const markRead = useMarkChatRead(event.id)
  const toast = useToast()

  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastId = messages?.[messages.length - 1]?.id
  const feed = useMemo(() => buildFeed(messages ?? []), [messages])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  function onPickImage(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: t('chat.imageInvalidType', 'Можно прикрепить только изображение'), status: 'error' })
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast({ title: t('chat.imageTooLarge', 'Файл слишком большой (макс. 10 МБ)'), status: 'error' })
      return
    }
    setImageFile(file)
  }

  // Scroll to newest and clear the unread badge whenever the feed grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
    if (event.id) markRead.mutate()
    // markRead.mutate is stable; depend on the latest message + event only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, event.id])

  const isOrganizer = event.organizer.is_me

  function submit() {
    const body = text.trim()
    if (imageFile) {
      if (sendImage.isPending) return
      const file = imageFile
      setImageFile(null)
      setText('')
      sendImage.mutate({ file, caption: body || undefined }, {
        onError: () => toast({ title: t('chat.imageSendError', 'Не удалось отправить изображение'), status: 'error' }),
      })
      return
    }
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
          feed.map(({ message: m, showHeader, dateDivider }) => {
            const mine = m.is_mine
            const canDelete = !m.deleted && (mine || isOrganizer)
            return (
              <div key={m.id}>
                {dateDivider && (
                  <div className="flex justify-center py-1">
                    <span className="text-[11px] text-ink-3 bg-bg-2 rounded-full px-2.5 py-0.5">{dateDivider}</span>
                  </div>
                )}
                <div className={cn('flex gap-2.5 group', mine && 'flex-row-reverse', !showHeader && 'mt-[-4px]')}>
                  <div className="w-7 shrink-0">
                    {showHeader && <Avatar name={m.author.name} size="sm" className="mt-0.5" />}
                  </div>
                  <div className={cn('flex flex-col gap-1 min-w-0 max-w-[80%]', mine && 'items-end')}>
                    {showHeader && (
                      <div className={cn('flex items-center gap-2', mine && 'flex-row-reverse')}>
                        <span className="text-[12.5px] font-semibold text-ink">{mine ? t('chat.you', 'Вы') : m.author.name}</span>
                        <span className="text-[11px] text-ink-3 tnum">{formatTime(m.created_at)}</span>
                      </div>
                    )}
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
                    {!m.deleted && m.image_url && (
                      <a
                        href={m.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block mb-1 -mx-0.5 first:mt-0"
                      >
                        <img
                          src={m.image_url}
                          alt=""
                          className="max-h-[220px] max-w-full rounded-[8px] object-cover"
                        />
                      </a>
                    )}
                    {m.deleted ? t('chat.deleted', 'Сообщение удалено') : m.body}
                  </div>
                </div>
                {!m.deleted && (
                  <div className="self-center flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition shrink-0">
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
        {imagePreview && (
          <div className="flex items-center gap-2 rounded-[8px] bg-bg-2 px-2.5 py-1.5">
            <img src={imagePreview} alt="" className="h-10 w-10 rounded-[6px] object-cover shrink-0" />
            <span className="flex-1 min-w-0 truncate text-[12px] text-ink-3">{imageFile?.name}</span>
            <button
              type="button"
              aria-label={t('common.cancel', 'Отмена')}
              onClick={() => setImageFile(null)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              onPickImage(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendMessage.isPending || sendImage.isPending}
            aria-label={t('chat.attachImage', 'Прикрепить изображение')}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            <ImageIcon size={16} />
          </Button>
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
            disabled={(!text.trim() && !imageFile) || sendMessage.isPending || sendImage.isPending}
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
