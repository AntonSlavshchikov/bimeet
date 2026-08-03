import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSwipeable } from 'react-swipeable'
import { CheckCircle2, ChevronRight, Trash2 } from 'lucide-react'
import type { EventListItem, PublicEventListItem } from '@/entities/event/model/types'
import { eventAccentColor } from '@/shared/lib/eventAccentColor'
import { DateCell } from '@/shared/ui/date-cell'
import { StatusPill, StatusPillButton } from '@/shared/ui/status-pill'
import { Avatar, AvatarStack } from '@/shared/ui/avatar'
import { cn } from '@/shared/lib/cn'
import { clampSwipeOffset, resolveSwipeRestingOffset } from './model/swipe'

function formatRowTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface EventListRowProps {
  event: EventListItem | PublicEventListItem
  /** Статус текущего пользователя для этого события */
  myStatus?: string
  /** Возможно ли подтвердить участие прямо из строки. */
  canJoin?: boolean
  onJoin?: () => void
  /** Подпись в DateCell: день недели (внутри одного месяца) или сокращение месяца. */
  dateCaption?: 'weekday' | 'month'
  /** Расстояние от текущей позиции пользователя; только для публичного каталога. */
  distanceKm?: number
  /** Действия организатора, открывающиеся свайпом влево на мобильных устройствах. */
  onComplete?: () => void
  onDelete?: () => void
}

const SWIPE_ACTION_WIDTH = 88

export default function EventListRow({
  event,
  myStatus,
  canJoin,
  onJoin,
  dateCaption = 'weekday',
  distanceKm,
  onComplete,
  onDelete,
}: EventListRowProps) {
  const { t, i18n } = useTranslation()
  const d = new Date(event.date_start)
  const day = d.getDate()
  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU'
  const caption = new Intl.DateTimeFormat(locale, dateCaption === 'month' ? { month: 'short' } : { weekday: 'short' })
    .format(d)
    .replace('.', '')
  const time = formatRowTime(event.date_start)
  const accent = eventAccentColor(event)
  const isCompleted = event.status === 'completed'
  const confirmedCount =
    event.confirmed_count ?? event.participants.filter(p => p.status === 'confirmed').length
  const confirmed = event.participants.filter(p => p.status === 'confirmed').slice(0, 3)
  const formattedDistance = distanceKm == null
    ? null
    : new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: distanceKm < 10 ? 1 : 0,
      }).format(distanceKm)
  const actionCount = Number(Boolean(onComplete)) + Number(Boolean(onDelete))
  const actionWidth = actionCount * SWIPE_ACTION_WIDTH
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches,
  )
  const swipeEnabled = actionCount > 0 && isMobile
  const startOffsetRef = useRef(0)
  const swipeMovedRef = useRef(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 760px)')
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
      if (!event.matches) setOffset(0)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const swipeHandlers = useSwipeable({
    onTouchStartOrOnMouseDown: () => {
      startOffsetRef.current = offset
      swipeMovedRef.current = false
    },
    onSwiping: data => {
      if (data.dir !== 'Left' && data.dir !== 'Right') return
      swipeMovedRef.current = true
      setIsDragging(true)
      setOffset(clampSwipeOffset(startOffsetRef.current + data.deltaX, actionWidth))
    },
    onSwiped: data => {
      if (data.dir === 'Left' || data.dir === 'Right') {
        setOffset(resolveSwipeRestingOffset({
          startOffset: startOffsetRef.current,
          deltaX: data.deltaX,
          velocity: data.velocity,
          actionWidth,
        }))
      }
      setIsDragging(false)
    },
    onTouchEndOrOnMouseUp: () => setIsDragging(false),
    delta: 12,
    trackTouch: swipeEnabled,
    trackMouse: false,
    preventScrollOnSwipe: false,
    touchEventOptions: { passive: true },
  })

  function handleRowClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!swipeEnabled) return
    if (swipeMovedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      swipeMovedRef.current = false
      return
    }
    if (offset < 0) {
      e.preventDefault()
      e.stopPropagation()
      setOffset(0)
    }
  }

  function runAction(action: () => void) {
    setOffset(0)
    action()
  }

  return (
    <div
      {...swipeHandlers}
      data-swipe-navigation-ignore={swipeEnabled ? '' : undefined}
      className={cn('relative min-w-0 overflow-hidden bg-surface', swipeEnabled && 'touch-pan-y')}
    >
      {swipeEnabled && (
        <div
          className="absolute inset-y-0 right-0 flex items-stretch min-[761px]:hidden"
          style={{ width: actionWidth }}
        >
          {onComplete && (
            <button
              type="button"
              className="flex w-[88px] flex-col items-center justify-center gap-1 bg-warning px-1 text-[10px] font-semibold text-white transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              onFocus={() => setOffset(-actionWidth)}
              onClick={() => runAction(onComplete)}
              aria-label={`${t('eventInfo.menuComplete')}: ${event.title}`}
            >
              <CheckCircle2 size={19} strokeWidth={2.1} />
              {t('eventInfo.menuComplete')}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="flex w-[88px] flex-col items-center justify-center gap-1 bg-danger px-1 text-[10px] font-semibold text-white transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              onFocus={() => setOffset(-actionWidth)}
              onClick={() => runAction(onDelete)}
              aria-label={`${t('eventInfo.menuDelete')}: ${event.title}`}
            >
              <Trash2 size={19} strokeWidth={2.1} />
              {t('eventInfo.menuDelete')}
            </button>
          )}
        </div>
      )}

      <Link
        to={`/events/${event.id}`}
        onClick={handleRowClick}
        className={cn(
          'group relative grid min-w-0 items-center gap-[10px] bg-surface px-3 py-3 pl-[15px] cursor-pointer hover:bg-hover',
          'grid-cols-[48px_minmax(0,1fr)_auto_11px] max-[420px]:grid-cols-[48px_minmax(0,1fr)_11px]',
          'min-[1081px]:grid-cols-[47px_minmax(150px,1fr)_92px_64px_48px_72px_12px] min-[1081px]:gap-3 min-[1081px]:px-[14px] min-[1081px]:pl-[17px]',
          !isDragging && 'transition-transform duration-200 ease-out',
          isCompleted && '[&>*]:opacity-55',
        )}
        style={{ transform: `translateX(${offset}px)` }}
        aria-expanded={swipeEnabled ? offset < 0 : undefined}
      >
      <div
        className={cn('absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-[4px]', {
          'bg-accent': accent === 'blue',
          'bg-success': accent === 'green',
          'bg-warning': accent === 'orange',
          'bg-danger': accent === 'red',
          'bg-purple': accent === 'purple',
          'bg-indigo': accent === 'indigo',
          'bg-ink-4': accent === 'gray',
        })}
        aria-hidden
      />

      <div className="flex justify-center">
        <DateCell day={day} caption={caption} />
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <div className="truncate text-[12.5px] font-bold tracking-[-0.01em] text-ink">
          {event.title}
        </div>
        {event.location && (
          <div className="truncate text-[10px] text-ink-3">
            {event.location}
            {formattedDistance != null && ` · ${t('publicEvents.distanceKm', { distance: formattedDistance })}`}
          </div>
        )}
      </div>

      <div className="hidden text-[10.5px] text-ink-2 tnum min-[1081px]:block">{time}</div>

      <div className="hidden min-w-0 items-center min-[1081px]:flex">
        {confirmed.length > 0 && (
          <AvatarStack>
            {confirmed.map((p, index) => (
              <Avatar key={`${p.user.name}-${index}`} name={p.user.name} size="sm" />
            ))}
          </AvatarStack>
        )}
      </div>

      <div className="hidden whitespace-nowrap text-[9.5px] text-ink-3 tnum min-[1081px]:block">
        {confirmedCount} {t('eventCard.peopleShort')}
      </div>

      <div className="flex min-w-0 items-center justify-end max-[420px]:hidden">
        {(() => {
          if (isCompleted) {
            return <StatusPill variant="completed" size="sm">{t('eventCard.statusCompleted')}</StatusPill>
          }
          if (event.organizer.is_me) {
            return <StatusPill variant="host" size="sm">{t('eventCard.statusHost')}</StatusPill>
          }
          if (myStatus === 'confirmed') {
            return <StatusPill variant="going" size="sm">{t('eventCard.statusConfirmed')}</StatusPill>
          }
          if (myStatus === 'declined') {
            return <StatusPill variant="declined" size="sm">{t('eventCard.statusDeclined')}</StatusPill>
          }
          if (myStatus === 'invited' && canJoin) {
            return (
              <StatusPillButton
                variant="invited"
                size="sm"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onJoin?.() }}
              >
                {t('eventCard.statusInvited')}
              </StatusPillButton>
            )
          }
          if (myStatus === 'invited') {
            return <StatusPill variant="invited" size="sm">{t('eventCard.statusInvited')}</StatusPill>
          }
          if (canJoin === true) {
            return (
              <StatusPillButton
                variant="action"
                size="sm"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onJoin?.() }}
              >
                {t('eventCard.attendButton')}
              </StatusPillButton>
            )
          }
          if (canJoin === false) {
            return <StatusPill variant="completed" size="sm">{t('eventInfo.noSpots')}</StatusPill>
          }
          return null
        })()}
      </div>

        <ChevronRight size={12} className="justify-self-end text-ink-4" />
      </Link>
    </div>
  )
}
