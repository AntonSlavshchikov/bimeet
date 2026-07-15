import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import type { EventListItem, PublicEventListItem } from '@/entities/event/model/types'
import { eventAccentColor } from '@/shared/lib/eventAccentColor'
import { DateCell } from '@/shared/ui/date-cell'
import { StatusPill, StatusPillButton } from '@/shared/ui/status-pill'
import { Avatar, AvatarStack } from '@/shared/ui/avatar'
import { cn } from '@/shared/lib/cn'

const MONTHS_SHORT_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const WEEKDAYS_SHORT_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

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
}

export default function EventListRow({
  event,
  myStatus,
  canJoin,
  onJoin,
  dateCaption = 'weekday',
  distanceKm,
}: EventListRowProps) {
  const { t, i18n } = useTranslation()
  const d = new Date(event.date_start)
  const day = d.getDate()
  const caption = dateCaption === 'month' ? MONTHS_SHORT_RU[d.getMonth()] : WEEKDAYS_SHORT_RU[d.getDay()]
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

  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'group relative grid min-w-0 items-center gap-[10px] px-3 py-3 pl-[15px] transition cursor-pointer hover:bg-hover',
        'grid-cols-[48px_minmax(0,1fr)_auto_11px]',
        'lg:grid-cols-[47px_minmax(150px,1fr)_92px_64px_48px_72px_12px] lg:gap-3 lg:px-[14px] lg:pl-[17px]',
        isCompleted && 'opacity-55',
      )}
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

      <div className="hidden text-[10.5px] text-ink-2 tnum lg:block">{time}</div>

      <div className="hidden min-w-0 items-center lg:flex">
        {confirmed.length > 0 && (
          <AvatarStack>
            {confirmed.map((p, index) => (
              <Avatar key={`${p.user.name}-${index}`} name={p.user.name} size="sm" />
            ))}
          </AvatarStack>
        )}
      </div>

      <div className="hidden whitespace-nowrap text-[9.5px] text-ink-3 tnum lg:block">
        {confirmedCount} {t('eventCard.peopleShort')}
      </div>

      <div className="flex min-w-0 items-center justify-end">
        {(() => {
          if (isCompleted) {
            return <StatusPill variant="completed" size="sm">{t('eventCard.statusCompleted')}</StatusPill>
          }
          if (event.organizer.is_me) {
            return <StatusPill variant="host" size="sm">{t('eventCard.statusOrganizer')}</StatusPill>
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
  )
}
