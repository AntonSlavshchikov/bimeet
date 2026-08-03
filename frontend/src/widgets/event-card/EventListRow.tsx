import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSwipeable } from 'react-swipeable'
import { CheckCircle2, ChevronRight, Trash2, UserCheck, UserX, type LucideIcon } from 'lucide-react'
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
  onAttend?: () => void
  onDecline?: () => void
}

const SWIPE_ACTION_WIDTH = 88

interface SwipeAction {
  key: string
  label: string
  tileClass: string
  iconClass: string
  icon: LucideIcon
  active?: boolean
  onClick: () => void
}

export default function EventListRow({
  event,
  myStatus,
  canJoin,
  onJoin,
  dateCaption = 'weekday',
  distanceKm,
  onComplete,
  onDelete,
  onAttend,
  onDecline,
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
  const swipeActions: SwipeAction[] = []
  if (onComplete) {
    swipeActions.push({
      key: 'complete',
      label: t('eventInfo.menuComplete'),
      tileClass: 'bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] text-warning hover:bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)]',
      iconClass: 'bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)]',
      icon: CheckCircle2,
      onClick: onComplete,
    })
  }
  if (onDelete) {
    swipeActions.push({
      key: 'delete',
      label: t('eventInfo.menuDelete'),
      tileClass: 'bg-[color-mix(in_srgb,var(--color-danger)_9%,transparent)] text-danger hover:bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',
      iconClass: 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',
      icon: Trash2,
      onClick: onDelete,
    })
  }
  if (onAttend) {
    swipeActions.push({
      key: 'attend',
      label: t('eventCard.swipeParticipating'),
      tileClass: 'bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-success hover:bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)]',
      iconClass: 'bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)]',
      icon: UserCheck,
      active: myStatus === 'confirmed',
      onClick: onAttend,
    })
  }
  if (onDecline) {
    swipeActions.push({
      key: 'decline',
      label: t('eventCard.swipeNotParticipating'),
      tileClass: 'bg-[color-mix(in_srgb,var(--color-danger)_9%,transparent)] text-danger hover:bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',
      iconClass: 'bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',
      icon: UserX,
      active: myStatus === 'declined',
      onClick: onDecline,
    })
  }
  const actionWidth = swipeActions.length * SWIPE_ACTION_WIDTH
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)').matches,
  )
  const swipeEnabled = swipeActions.length > 0 && isMobile
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
          className="absolute inset-y-0 right-0 grid auto-cols-fr grid-flow-col gap-0.5 bg-bg-2 p-1 min-[761px]:hidden"
          style={{ width: actionWidth }}
        >
          {swipeActions.map(action => {
            const Icon = action.icon
            return (
              <button
                key={action.key}
                type="button"
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] px-1 py-1 text-center text-[10px] font-semibold leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                  action.tileClass,
                  action.active && 'ring-1 ring-inset ring-current/30',
                )}
                onFocus={() => setOffset(-actionWidth)}
                onClick={() => runAction(action.onClick)}
                aria-label={`${action.label}: ${event.title}`}
                aria-pressed={action.active}
              >
                <span className={cn('grid size-7 shrink-0 place-items-center rounded-full', action.iconClass)} aria-hidden>
                  <Icon size={17} strokeWidth={2} />
                </span>
                <span className="flex min-h-6 items-center justify-center text-balance">
                  {action.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <Link
        to={`/events/${event.id}`}
        onClick={handleRowClick}
        className={cn(
          'group relative grid min-h-16 min-w-0 items-center gap-[10px] bg-surface px-3 py-3 pl-[15px] cursor-pointer hover:bg-hover',
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
