import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { eventAccentColor } from '@/shared/lib/eventAccentColor'
import { formatDate, formatTime } from '@/shared/lib/formatDate'
import { useDeleteEvent, useJoinPublicEvent } from '@/features/event-manage/model/hooks'
import { useUpdateParticipantStatus } from '@/features/participants/model/hooks'
import {
  Avatar,
  AvatarStack,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  StatusPill,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
} from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface EventInfoPanelProps {
  event: Event
  isOrganizer: boolean
}

const ACCENT_TO_GRADIENT: Record<string, string> = {
  blue: 'from-accent/25',
  green: 'from-success/25',
  orange: 'from-warning/25',
  red: 'from-danger/25',
  purple: 'from-purple/25',
  indigo: 'from-indigo/25',
  gray: 'from-ink-4/25',
}

export default function EventInfoPanel({ event, isOrganizer }: EventInfoPanelProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const [descExpanded, setDescExpanded] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const deleteEvent = useDeleteEvent()
  const joinPublicEvent = useJoinPublicEvent()
  const updateStatus = useUpdateParticipantStatus(event.id)

  const myParticipant = event.participants.find(p => p.user?.is_me)
  const isParticipant = !!myParticipant
  const confirmedCount =
    event.confirmed_count ?? event.participants.filter(p => p.status === 'confirmed').length
  const confirmed = event.participants.filter(p => p.status === 'confirmed')
  const spotsLeft = event.max_guests != null ? event.max_guests - confirmedCount : null
  const canJoin =
    event.is_public &&
    event.status === 'active' &&
    !isOrganizer &&
    !isParticipant &&
    (spotsLeft == null || spotsLeft > 0)
  const noSpots =
    event.is_public && !isOrganizer && !isParticipant && spotsLeft != null && spotsLeft <= 0
  const canRespond = isParticipant && !isOrganizer && event.status === 'active'

  const isPermanent = event.date_start == null
  const sameDay = !isPermanent && formatDate(event.date_start!) === formatDate(event.date_end!)
  const descLong = (event.description ?? '').length > 160
  const accent = eventAccentColor(event)

  function handleJoin() {
    joinPublicEvent.mutate(event.id, {
      onSuccess: () => toast({ title: t('eventInfo.joinSuccess', 'Вы присоединились'), status: 'success' }),
      onError: err => toast({ title: t('common.error', 'Ошибка'), description: err.message, status: 'error' }),
    })
  }

  function handleDelete() {
    deleteEvent.mutate(event.id, {
      onSuccess: () => {
        setDeleteOpen(false)
        navigate('/events')
      },
    })
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-[14px] border border-line bg-surface">
        {/* Decorative gradient blob, top-right */}
        <div
          className={cn(
            'pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br to-transparent blur-3xl',
            ACCENT_TO_GRADIENT[accent],
          )}
          aria-hidden
        />
        {/* Accent bar */}
        <div className={cn('relative h-1 w-full bg-gradient-to-r', ACCENT_TO_GRADIENT[accent].replace('/25', ''), 'to-transparent')} aria-hidden />

        <div className="relative p-5 sm:p-6">
          {/* Header: status + menu */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {event.status === 'completed' ? (
                <StatusPill variant="completed" size="sm">
                  {t('eventInfo.statusCompleted', 'Завершена')}
                </StatusPill>
              ) : isOrganizer ? (
                <StatusPill variant="host" size="sm">
                  {t('eventInfo.statusHost', 'Вы организатор')}
                </StatusPill>
              ) : myParticipant?.status === 'confirmed' ? (
                <StatusPill variant="going" size="sm">
                  {t('eventInfo.statusGoing', 'Вы идёте')}
                </StatusPill>
              ) : myParticipant?.status === 'declined' ? (
                <StatusPill variant="neutral" size="sm">
                  {t('eventInfo.statusDeclined', 'Вы не идёте')}
                </StatusPill>
              ) : isParticipant ? (
                <StatusPill variant="invited" size="sm">
                  {t('eventInfo.statusPending', 'Ждём ответа')}
                </StatusPill>
              ) : null}
            </div>
            {isOrganizer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('eventInfo.menuActions', 'Действия')}
                    className="-mt-1 inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-ink-3 hover:bg-hover hover:text-ink transition focus-ring shrink-0"
                  >
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {event.status === 'active' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate(`/events/${event.id}/edit`)}>
                        <Pencil size={14} className="text-ink-3" />
                        {t('common.edit', 'Редактировать')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem destructive onClick={() => setDeleteOpen(true)}>
                    <Trash2 size={14} />
                    {t('common.delete', 'Удалить')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Title */}
          <h1 className="text-[26px] sm:text-[28px] font-bold tracking-[-0.02em] leading-[1.15] text-ink">
            {event.title}
          </h1>

          {/* Description */}
          {event.description && (
            <div className="mt-2.5 max-w-[640px]">
              <p
                className={cn(
                  'text-[14px] text-ink-2 leading-[1.6] whitespace-pre-wrap',
                  descLong && !descExpanded && 'line-clamp-2',
                )}
              >
                {event.description}
              </p>
              {descLong && (
                <button
                  type="button"
                  onClick={() => setDescExpanded(v => !v)}
                  className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:opacity-80 transition"
                >
                  {descExpanded ? (
                    <><ChevronUp size={12} /> {t('eventInfo.descCollapse', 'Свернуть')}</>
                  ) : (
                    <><ChevronDown size={12} /> {t('eventInfo.descExpand', 'Подробнее')}</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Meta row — single line, wraps on narrow screens */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} className="text-ink-3 shrink-0" />
              {isPermanent
                ? t('eventInfo.permanentDates', 'Постоянная встреча — без даты')
                : sameDay
                  ? `${formatDate(event.date_start!)} · ${formatTime(event.date_start!)}–${formatTime(event.date_end!)}`
                  : `${formatDate(event.date_start!)} — ${formatDate(event.date_end!)}`}
            </span>

            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-ink-3 shrink-0" />
                {event.location}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5">
              <Users size={14} className="text-ink-3 shrink-0" />
              {event.max_guests != null
                ? `${confirmedCount} / ${event.max_guests}`
                : t('eventInfo.confirmedCount', { count: confirmedCount, defaultValue: `${confirmedCount} участников` })}
            </span>

            {confirmed.length > 0 && (
              <AvatarStack max={5} size="sm">
                {confirmed.map(p => (
                  <Avatar key={p.user.email} name={p.user.name} size="sm" />
                ))}
              </AvatarStack>
            )}
          </div>

          {/* CTAs */}
          {canRespond && (
            <div className="mt-5 flex gap-2.5">
              <Button
                className={cn(
                  'bg-gradient-to-r from-accent to-purple text-white hover:opacity-90 border-0',
                  myParticipant.status === 'confirmed' && 'ring-2 ring-accent/40',
                )}
                onClick={() => updateStatus.mutate({ status: 'confirmed' })}
                disabled={updateStatus.isPending}
              >
                {t('participants.going', 'Я иду')}
              </Button>
              <Button
                variant="outline"
                className={cn(myParticipant.status === 'declined' && 'bg-bg-2 text-ink font-semibold')}
                onClick={() => updateStatus.mutate({ status: 'declined' })}
                disabled={updateStatus.isPending}
              >
                {t('eventInfo.cantMake', 'Не смогу')}
              </Button>
            </div>
          )}

          {(canJoin || noSpots) && (
            <div className="mt-5">
              {canJoin ? (
                <Button
                  className="bg-gradient-to-r from-accent to-purple text-white hover:opacity-90 border-0"
                  onClick={handleJoin}
                  disabled={joinPublicEvent.isPending}
                >
                  {t('eventInfo.join', 'Присоединиться')}
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button disabled>
                      {t('eventInfo.join', 'Присоединиться')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('eventInfo.noSpots', 'Мест нет')}</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Organizer */}
          <div className="mt-4 pt-3 border-t border-line-soft flex items-center gap-1.5">
            <span className="text-[11.5px] text-ink-3">{t('eventInfo.organizer', 'Организатор:')}</span>
            <span className="text-[11.5px] font-semibold text-ink-2">{event.organizer.name}</span>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('eventInfo.deleteDialogTitle', 'Удалить встречу?')}</DialogTitle>
            <DialogDescription>
              {t('eventInfo.deleteDialogBody', 'Все участники получат уведомление. Это действие нельзя отменить.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button ref={cancelRef} variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteEvent.isPending}>
              {t('eventInfo.deleteDialogConfirm', 'Удалить')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
