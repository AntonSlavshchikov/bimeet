import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Globe, Lock, MessageCircle } from 'lucide-react'
import type { EventListItem, PublicEventListItem } from '@/entities/event/model/types'
import { eventAccentColor } from '@/shared/lib/eventAccentColor'
import { DateCell } from '@/shared/ui/date-cell'
import { TimeCell } from '@/shared/ui/time-cell'
import { StatusPill, StatusPillButton } from '@/shared/ui/status-pill'
import { EventTag } from '@/shared/ui/event-tag'
import { Avatar, AvatarStack } from '@/shared/ui/avatar'
import { cn } from '@/shared/lib/cn'
import { MONTHS_SHORT_RU } from '@/shared/lib/formatDate'

const WEEKDAYS_SHORT_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

function formatRowTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface EventListRowProps {
  event: EventListItem | PublicEventListItem
  /** Статус текущего пользователя для этого события */
  myStatus?: string
  /** Возможно ли «Иду» — true действует, false disabled, undefined скрывает кнопку */
  canJoin?: boolean
  onJoin?: () => void
  /** Подпись в DateCell: день недели (внутри одного месяца) или сокращение месяца. */
  dateCaption?: 'weekday' | 'month'
}

export default function EventListRow({
  event,
  myStatus,
  canJoin,
  onJoin,
  dateCaption = 'weekday',
}: EventListRowProps) {
  const { t } = useTranslation()
  const isPermanent = event.date_start == null
  const d = event.date_start ? new Date(event.date_start) : null
  const day = d?.getDate()
  const caption = d ? (dateCaption === 'month' ? MONTHS_SHORT_RU[d.getMonth()] : WEEKDAYS_SHORT_RU[d.getDay()]) : undefined
  const time = event.date_start ? formatRowTime(event.date_start) : ''
  const accent = eventAccentColor(event)
  const isCompleted = event.status === 'completed'
  const confirmedCount =
    event.confirmed_count ?? event.participants.filter(p => p.status === 'confirmed').length

  const confirmed = event.participants.filter(p => p.status === 'confirmed').slice(0, 3)
  const more = Math.max(0, confirmedCount - confirmed.length)

  const showPublicTag = event.is_public

  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'group relative grid items-center transition cursor-pointer hover:bg-hover',
        'grid-cols-[4px_64px_minmax(0,1fr)_16px]',
        'sm:grid-cols-[4px_64px_minmax(0,1fr)_160px_16px]',
        'lg:grid-cols-[4px_64px_minmax(220px,1fr)_160px_120px_130px_16px]',
        'gap-4 pr-4 py-3.5',
        isCompleted && 'opacity-55',
      )}
    >
      {/* Accent bar — full row height, скруглён справа (как в макете) */}
      <div
        className={cn('self-stretch rounded-r-[4px]', {
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

      {/* Date — or a chat icon for a permanent (dateless) event */}
      <div className="flex justify-center">
        {isPermanent ? (
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent/10 text-accent">
            <MessageCircle size={16} />
          </div>
        ) : (
          <DateCell day={day!} caption={caption} />
        )}
      </div>

      {/* Info — title, tags, description */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-nowrap">
          <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink truncate min-w-0">
            {event.title}
          </span>
          {showPublicTag ? (
            <EventTag variant="public">
              <Globe size={10} className="-ml-0.5" />
              {t('eventCard.publicBadge')}
            </EventTag>
          ) : (
            <EventTag>
              <Lock size={10} className="-ml-0.5 opacity-70" />
              {t('eventCard.personalBadge')}
            </EventTag>
          )}
        </div>
        {event.location && (
          <div className="text-[12.5px] text-ink-3 truncate">
            {event.location}
          </div>
        )}
      </div>

      {/* Time + place (≥sm) — permanent events show a "постоянная" label instead */}
      <div className="hidden sm:block">
        <TimeCell time={isPermanent ? t('events.permanentLabel', 'Постоянная') : time} place={event.location} />
      </div>

      {/* Avatars (≥lg) */}
      <div className="hidden lg:flex items-center gap-2 min-w-0">
        {confirmed.length > 0 && (
          <AvatarStack>
            {confirmed.map((p, index) => (
              <Avatar key={`${p.user.name}-${index}`} name={p.user.name} size="sm" />
            ))}
          </AvatarStack>
        )}
        {more > 0 && <span className="text-[12px] text-ink-3 tnum">+{more}</span>}
        {confirmed.length === 0 && more === 0 && (
          <span className="text-[12px] text-ink-3 tnum">0 чел.</span>
        )}
      </div>

      {/* Action / status (≥lg) */}
      <div className="hidden lg:flex justify-end items-center">
        {(() => {
          if (isCompleted) {
            return <StatusPill variant="completed">{t('eventCard.statusCompleted', 'Завершена')}</StatusPill>
          }
          if (event.organizer.is_me) {
            return <StatusPill variant="host">{t('eventCard.statusHost', 'Организатор')}</StatusPill>
          }
          if (myStatus === 'confirmed') {
            return <StatusPill variant="going">{t('eventCard.statusConfirmed', 'Иду')}</StatusPill>
          }
          if (myStatus === 'invited' && canJoin) {
            return (
              <StatusPillButton
                variant="invited"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onJoin?.() }}
              >
                {t('eventCard.confirmButton', 'Подтвердить')}
              </StatusPillButton>
            )
          }
          if (canJoin === true) {
            return (
              <StatusPillButton
                variant="action"
                onClick={e => { e.preventDefault(); e.stopPropagation(); onJoin?.() }}
              >
                {t('eventCard.attendButton', 'Иду')}
              </StatusPillButton>
            )
          }
          if (canJoin === false) {
            return <StatusPill variant="completed">{t('eventInfo.noSpots', 'Мест нет')}</StatusPill>
          }
          return null
        })()}
      </div>

      {/* Chevron */}
      <ChevronRight size={14} className="text-ink-4 justify-self-end" />
    </Link>
  )
}
