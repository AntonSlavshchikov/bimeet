import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Lock,
  MapPin,
  MoreVertical,
  Pencil,
  Shirt,
  Trash2,
  Users,
} from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { eventAccentColor } from '@/shared/lib/eventAccentColor'
import { formatDate, formatTime } from '@/shared/lib/formatDate'
import { useDeleteEvent, useJoinPublicEvent } from '@/features/event-manage/model/hooks'
import { useAuth } from '@/features/auth/model/AuthContext'
import {
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

const ACCENT_TO_BG: Record<string, string> = {
  blue: 'bg-accent',
  green: 'bg-success',
  orange: 'bg-warning',
  red: 'bg-danger',
  purple: 'bg-purple',
  indigo: 'bg-indigo',
  gray: 'bg-ink-4',
}

export default function EventInfoPanel({ event, isOrganizer }: EventInfoPanelProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const [descExpanded, setDescExpanded] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const deleteEvent = useDeleteEvent()
  const joinPublicEvent = useJoinPublicEvent()

  const isParticipant = event.participants.some(p => p.user?.id === user?.id)
  const confirmedCount =
    event.confirmed_count ?? event.participants.filter(p => p.status === 'confirmed').length
  const spotsLeft = event.max_guests != null ? event.max_guests - confirmedCount : null
  const canJoin =
    event.is_public &&
    event.status === 'active' &&
    !isOrganizer &&
    !isParticipant &&
    (spotsLeft == null || spotsLeft > 0)
  const noSpots =
    event.is_public && !isOrganizer && !isParticipant && spotsLeft != null && spotsLeft <= 0

  const sameDay = formatDate(event.date_start) === formatDate(event.date_end)
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
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        {/* Accent bar */}
        <div className={cn('h-1 w-full', ACCENT_TO_BG[accent])} aria-hidden />

        <div className="p-5">
          {/* Header: status + menu */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {event.status === 'completed' && (
                <StatusPill variant="completed" size="sm">
                  {t('eventInfo.statusCompleted', 'Завершена')}
                </StatusPill>
              )}
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
          <h1 className="text-[22px] font-bold tracking-[-0.02em] leading-[1.2] text-ink">
            {event.title}
          </h1>

          {/* Description */}
          {event.description && (
            <div className="mt-3">
              <p
                className={cn(
                  'text-[13.5px] text-ink-2 leading-[1.6] whitespace-pre-wrap',
                  descLong && !descExpanded && 'line-clamp-3',
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

          {/* Meta */}
          <div className="mt-4 flex flex-col gap-2.5">
            {sameDay ? (
              <>
                <MetaRow icon={Calendar}>{formatDate(event.date_start)}</MetaRow>
                <MetaRow icon={Clock}>
                  {formatTime(event.date_start)} — {formatTime(event.date_end)}
                </MetaRow>
              </>
            ) : (
              <MetaRow icon={Calendar}>
                {formatDate(event.date_start)}, {formatTime(event.date_start)}
                <br />— {formatDate(event.date_end)}, {formatTime(event.date_end)}
              </MetaRow>
            )}

            {event.location && <MetaRow icon={MapPin}>{event.location}</MetaRow>}

            {event.dress_code && (
              <MetaRow icon={Shirt}>
                {t('eventInfo.dressCode', { value: event.dress_code, defaultValue: `Дресс-код: ${event.dress_code}` })}
              </MetaRow>
            )}

            <MetaRow icon={event.is_public ? Globe : Lock}>
              {event.is_public ? t('eventCard.publicBadge', 'Публичная') : t('eventCard.personalBadge', 'Личная')}
            </MetaRow>

            <MetaRow icon={Users}>
              {event.max_guests != null
                ? `${confirmedCount} / ${event.max_guests}`
                : t('eventInfo.confirmedCount', { count: confirmedCount, defaultValue: `${confirmedCount} подтвердили` })}
            </MetaRow>
          </div>

          {/* Join CTA */}
          {(canJoin || noSpots) && (
            <div className="mt-5">
              {canJoin ? (
                <Button
                  className="w-full"
                  onClick={handleJoin}
                  disabled={joinPublicEvent.isPending}
                >
                  {t('eventInfo.join', 'Присоединиться')}
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button className="w-full" disabled>
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

function MetaRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 text-[13.5px] text-ink-2 leading-[1.5]">
      <Icon size={14} className="text-ink-3 shrink-0 mt-0.5" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
