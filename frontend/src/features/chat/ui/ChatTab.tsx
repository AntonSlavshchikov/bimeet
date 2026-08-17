import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image as ImageIcon, MessageCircle, Reply, Search, SearchX, Send, SmilePlus, Trash2, X } from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import type { Message } from '@/entities/message/model/types'
import { useAuth } from '@/features/auth/model/AuthContext'
import {
  useMessages,
  useSendMessage,
  useSendImageMessage,
  useDeleteMessage,
  useMarkChatRead,
  useToggleReaction,
  useLoadOlderMessages,
} from '@/features/chat/model/hooks'
import { dateGroupLabel, formatTime } from '@/shared/lib/formatDate'
import { Avatar, Button, Input, Textarea, useToast } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

const MAX_IMAGE_SIZE = 10 << 20 // 10 MB
const GROUP_WINDOW_MS = 5 * 60 * 1000
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

interface FeedEntry {
  message: Message
  showHeader: boolean
  dateDivider: string | null
}

// Groups consecutive messages from the same author within a 5-minute window (no
// avatar/name repeated), and inserts a date divider whenever the calendar day changes.
function buildFeed(messages: Message[], locale: string): FeedEntry[] {
  return messages.map((m, i) => {
    const prev = messages[i - 1]
    const dateDivider = !prev || dateGroupLabel(m.created_at, locale) !== dateGroupLabel(prev.created_at, locale)
      ? dateGroupLabel(m.created_at, locale)
      : null
    const sameAuthor = !!prev && prev.author.email === m.author.email && prev.is_mine === m.is_mine
    const withinWindow = !!prev && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_WINDOW_MS
    const showHeader = !dateDivider ? !(sameAuthor && withinWindow && !m.reply_to) : true
    return { message: m, showHeader, dateDivider }
  })
}

const MENTION_PATTERN = /@([\p{L}\p{N}_]+)/gu

// Highlights @mentions in a message body — cheap client-side visual affordance,
// mirroring the backend's own @name parsing (see mentionPattern in messagesvc).
function renderWithMentions(body: string, mine: boolean): React.ReactNode {
  const parts = body.split(MENTION_PATTERN)
  if (parts.length === 1) return body
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className={cn('font-semibold', mine ? 'text-white' : 'text-accent')}>@{part}</span>
      : part,
  )
}

export default function ChatTab({ event }: { event: Event }) {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU'
  const me = user ? { name: user.name, email: user.email, is_me: true } : undefined

  const { data: messages, isLoading } = useMessages(event.id, user?.email)
  const sendMessage = useSendMessage(event.id, me)
  const sendImage = useSendImageMessage(event.id)
  const deleteMessage = useDeleteMessage(event.id)
  const markRead = useMarkChatRead(event.id)
  const toggleReaction = useToggleReaction(event.id, user?.email)
  const loadOlder = useLoadOlderMessages(event.id)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const toast = useToast()

  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // @mention autocomplete — names here are first-name-only (see backend
  // model.User), so a plain "@word" at the cursor is enough to match; no
  // need to quote multi-word names.
  const mentionCandidates = useMemo(() => {
    const list = event.participants
      .filter(p => !p.user.is_me)
      .map(p => p.user.name)
    if (!event.organizer.is_me) list.unshift(event.organizer.name)
    return Array.from(new Set(list))
  }, [event.participants, event.organizer])

  const mentionMatch = /@([\p{L}\p{N}_]+)$/u.exec(text)
  const mentionQuery = mentionMatch?.[1]?.toLowerCase()
  const mentionSuggestions = mentionQuery == null
    ? []
    : mentionCandidates.filter(name => name.toLowerCase().startsWith(mentionQuery)).slice(0, 5)

  function applyMention(name: string) {
    if (!mentionMatch) return
    const start = text.length - mentionMatch[0].length
    setText(`${text.slice(0, start)}@${name} `)
    textareaRef.current?.focus()
  }
  const lastId = messages?.[messages.length - 1]?.id
  // Client-side only: filters the messages already loaded into this chat
  // (the current page), not the full history and not other chats — message
  // bodies are encrypted at rest, so there is no server-side full-text index.
  const searchQuery = search.trim().toLowerCase()
  const visibleMessages = useMemo(() => {
    if (!searchQuery) return messages ?? []
    return (messages ?? []).filter(m => !m.deleted && m.body.toLowerCase().includes(searchQuery))
  }, [messages, searchQuery])
  const feed = useMemo(() => buildFeed(visibleMessages, locale), [visibleMessages, locale])

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

  // Scroll to newest and clear the unread badge whenever the feed grows,
  // but only if the user is already near the bottom — otherwise a new
  // message from someone else would yank them away from history they're
  // reading and mark it read before they've seen it.
  useEffect(() => {
    const el = scrollRef.current
    const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (!nearBottom) return
    bottomRef.current?.scrollIntoView({ block: 'end' })
    if (event.id) markRead.mutate()
    // markRead.mutate is stable; depend on the latest message + event only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, event.id])

  // Loading older history near the top would otherwise yank the scroll
  // position as content is prepended above it — restore the offset after.
  function onScroll() {
    const el = scrollRef.current
    if (!el || el.scrollTop > 80 || loadOlder.isPending || !hasMoreHistory) return
    const prevHeight = el.scrollHeight
    loadOlder.mutate(undefined, {
      onSuccess: ({ hasMore }) => {
        setHasMoreHistory(hasMore)
        requestAnimationFrame(() => {
          if (el) el.scrollTop += el.scrollHeight - prevHeight
        })
      },
    })
  }

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
    if ((e.key === 'Enter' || e.key === 'Tab') && mentionSuggestions.length > 0) {
      e.preventDefault()
      applyMention(mentionSuggestions[0])
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          {t('chat.sectionTitle', 'Чат встречи')}
        </div>
        <button
          type="button"
          aria-label={t('chat.search', 'Поиск по чату')}
          onClick={() => {
            setSearchOpen(o => !o)
            if (searchOpen) setSearch('')
          }}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-[8px] transition',
            searchOpen ? 'bg-hover text-ink' : 'text-ink-3 hover:bg-hover hover:text-ink',
          )}
        >
          <Search size={14} />
        </button>
      </div>

      {searchOpen && (
        <Input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('chat.searchPlaceholder', 'Поиск по загруженным сообщениям…')}
        />
      )}

      {/* Feed */}
      <div ref={scrollRef} onScroll={onScroll} className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <p className="text-[13px] text-ink-3 py-8 text-center">{t('common.loading', 'Загрузка…')}</p>
        ) : searchQuery && visibleMessages.length === 0 ? (
          <div className="rounded-[12px] border border-line bg-surface py-12 px-4 flex flex-col items-center gap-2">
            <SearchX size={26} className="text-ink-3" />
            <p className="text-[13px] text-ink-3">{t('chat.searchEmpty', 'Ничего не найдено')}</p>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-line bg-surface py-12 px-4 flex flex-col items-center gap-2">
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
                        <span className="text-[11px] text-ink-3 tnum">{formatTime(m.created_at, locale)}</span>
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
                    {m.deleted ? t('chat.deleted', 'Сообщение удалено') : renderWithMentions(m.body, mine)}
                  </div>
                  {!m.deleted && m.reactions && m.reactions.length > 0 && (
                    <div className={cn('flex flex-wrap gap-1', mine && 'justify-end')}>
                      {m.reactions.map(r => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => toggleReaction.mutate({ messageId: m.id, emoji: r.emoji })}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] border transition',
                            !!user?.email && r.reactors.includes(user.email)
                              ? 'bg-accent/10 border-accent text-accent'
                              : 'bg-bg-2 border-line-soft text-ink-2 hover:bg-hover',
                          )}
                        >
                          <span>{r.emoji}</span>
                          <span className="tnum">{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!m.deleted && (
                  <div className="relative self-center flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition shrink-0">
                    <button
                      type="button"
                      aria-label={t('chat.react', 'Реакция')}
                      onClick={() => setPickerFor(p => p === m.id ? null : m.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] text-ink-3 hover:bg-hover hover:text-ink"
                    >
                      <SmilePlus size={13} />
                    </button>
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
                    {pickerFor === m.id && (
                      <>
                        <button
                          type="button"
                          aria-label={t('common.cancel', 'Закрыть')}
                          onClick={() => setPickerFor(null)}
                          className="fixed inset-0 z-40 cursor-default"
                        />
                        <div
                          className={cn(
                            'absolute bottom-full mb-1 z-50 flex items-center gap-0.5 rounded-[10px] border border-line bg-surface p-1 shadow-lg',
                            mine ? 'right-0' : 'left-0',
                          )}
                        >
                          {QUICK_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                toggleReaction.mutate({ messageId: m.id, emoji })
                                setPickerFor(null)
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[16px] hover:bg-hover"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
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
          <div className="flex items-stretch gap-2.5 rounded-[8px] bg-bg-2 pl-2.5 pr-2 py-1.5">
            <span className="w-[3px] shrink-0 rounded-full bg-accent" />
            <div className="min-w-0 flex-1 text-[12px] py-0.5">
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <Reply size={12} className="text-accent shrink-0" />
                {t('chat.replyingTo', 'Ответ')} {replyTo.author.name}
              </span>
              <span className="block truncate text-ink-3 mt-0.5">
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
          <div className="relative flex-1">
            {mentionSuggestions.length > 0 && (
              <div className="absolute bottom-full mb-1 left-0 z-50 w-48 rounded-[10px] border border-line bg-surface p-1 shadow-lg">
                {mentionSuggestions.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => applyMention(name)}
                    className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[13px] text-ink hover:bg-hover"
                  >
                    <Avatar name={name} size="sm" />
                    {name}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={t('chat.placeholder', 'Написать сообщение…')}
              className="w-full resize-none min-h-[44px] max-h-[140px] py-2.5 leading-[1.4]"
            />
          </div>
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
