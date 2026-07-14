import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  ChevronLeft,
  MapPin,
  MoreHorizontal,
  Pencil,
  Shirt,
  Trash2,
  Users,
} from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { useDeleteEvent, useJoinPublicEvent } from '@/features/event-manage/model/hooks'
import { useUpdateParticipantStatus } from '@/features/participants/model/hooks'
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
  useToast,
} from '@/shared/ui'

interface EventInfoPanelProps {
  event: Event
  isOrganizer: boolean
}

export default function EventInfoPanel({ event, isOrganizer }: EventInfoPanelProps) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const deleteEvent = useDeleteEvent()
  const joinPublicEvent = useJoinPublicEvent()
  const updateStatus = useUpdateParticipantStatus(event.id)

  const myParticipant = event.participants.find(p => p.user.is_me)
  const confirmedCount =
    event.confirmed_count ?? event.participants.filter(p => p.status === 'confirmed').length
  const spotsLeft = event.max_guests != null ? event.max_guests - confirmedCount : null
  const canJoin =
    event.is_public &&
    event.status === 'active' &&
    !isOrganizer &&
    !myParticipant &&
    (spotsLeft == null || spotsLeft > 0)
  const noSpots = event.is_public && !isOrganizer && !myParticipant && spotsLeft != null && spotsLeft <= 0

  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-US' : 'ru-RU'
  const start = new Date(event.date_start)
  const end = new Date(event.date_end)
  const sameDay = start.toDateString() === end.toDateString()
  const shortDate = (date: Date) => date.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
  const shortTime = (date: Date) => date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const dateLabel = sameDay
    ? `${shortDate(start)} · ${shortTime(start)}–${shortTime(end)}`
    : `${shortDate(start)}, ${shortTime(start)} — ${shortDate(end)}, ${shortTime(end)}`

  function handleJoin() {
    joinPublicEvent.mutate(event.id, {
      onSuccess: () => toast({ title: t('eventInfo.joinSuccess'), status: 'success' }),
      onError: err => toast({ title: t('common.error'), description: err.message, status: 'error' }),
    })
  }

  function handleStatus(status: 'confirmed' | 'declined') {
    updateStatus.mutate({ status })
  }

  function handleDelete() {
    deleteEvent.mutate(event.id, {
      onSuccess: () => {
        setDeleteOpen(false)
        navigate('/events')
      },
    })
  }

  const statusBadge = (() => {
    if (event.status === 'completed') {
      return <StatusPill variant="completed" className="px-2 py-[5px] text-[9px] leading-none">{t('eventInfo.statusCompleted')}</StatusPill>
    }
    if (isOrganizer) {
      return <StatusPill variant="host" className="px-2 py-[5px] text-[9px] leading-none">{t('eventCard.statusOrganizer')}</StatusPill>
    }
    if (myParticipant?.status === 'confirmed') {
      return <StatusPill variant="going" className="px-2 py-[5px] text-[9px] leading-none">{t('eventInfo.statusYouGoing')}</StatusPill>
    }
    if (myParticipant?.status === 'declined') {
      return <StatusPill variant="declined" className="px-2 py-[5px] text-[9px] leading-none">{t('eventInfo.statusYouDeclined')}</StatusPill>
    }
    if (myParticipant?.status === 'invited') {
      return <StatusPill variant="invited" className="px-2 py-[5px] text-[9px] leading-none">{t('eventInfo.statusAwaiting')}</StatusPill>
    }
    return null
  })()

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 rounded-[8px] text-[11px] font-semibold text-ink-2 transition hover:text-ink focus-ring"
        >
          <ChevronLeft size={14} />
          {t('eventInfo.backAllEvents')}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('eventInfo.menuActions')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-bg-2 text-ink-2 transition hover:bg-hover hover:text-ink focus-ring"
            >
              <MoreHorizontal size={15} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOrganizer ? (
              <>
                {event.status === 'active' && (
                  <DropdownMenuItem onClick={() => navigate(`/events/${event.id}/edit`)}>
                    <Pencil size={14} className="text-ink-3" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={14} />
                  {t('common.delete')}
                </DropdownMenuItem>
              </>
            ) : myParticipant ? (
              <>
                <DropdownMenuItem onClick={() => handleStatus('confirmed')}>
                  {t('eventInfo.attend')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatus('declined')}>
                  {t('eventInfo.cannotAttend')}
                </DropdownMenuItem>
              </>
            ) : canJoin ? (
              <DropdownMenuItem onClick={handleJoin}>
                {t('eventInfo.join')}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>
                {t('eventInfo.noSpots')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <section className="relative mt-5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface p-[22px] max-[420px]:p-[17px]">
        <div
          className="pointer-events-none absolute right-[-65px] top-[-80px] h-[180px] w-[180px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-brand-violet)_25%,transparent),transparent_68%)]"
          aria-hidden
        />

        <div className="relative z-10">
          {statusBadge}

          <h1 className="mt-[14px] max-w-[460px] text-[26px] font-bold leading-[1.08] tracking-[-0.035em] text-ink max-[420px]:text-[22px]">
            {event.title}
          </h1>

          {event.description && (
            <p className="mt-[5px] max-w-[520px] whitespace-pre-wrap text-[11px] leading-[1.5] text-ink-2">
              {event.description}
            </p>
          )}

          <div className="mt-[18px] flex flex-wrap items-center gap-x-[18px] gap-y-2">
            <MetaItem icon={Calendar}>{dateLabel}</MetaItem>
            {event.location && <MetaItem icon={MapPin}>{event.location}</MetaItem>}
            <MetaItem icon={Users}>{t('eventInfo.participantsCount', { count: confirmedCount })}</MetaItem>
            {event.dress_code && <MetaItem icon={Shirt}>{event.dress_code}</MetaItem>}
          </div>

          {event.status === 'active' && (
            <div className="mt-[18px] flex flex-wrap gap-2">
              {!isOrganizer && myParticipant && (
                <>
                  <Button className="h-9 rounded-[var(--radius-control)] px-3.5 text-[11.5px]" onClick={() => handleStatus('confirmed')} disabled={updateStatus.isPending}>
                    {t('eventInfo.attend')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 rounded-[var(--radius-control)] bg-bg-2 px-3.5 text-[11.5px] text-ink hover:bg-hover"
                    onClick={() => handleStatus('declined')}
                    disabled={updateStatus.isPending}
                  >
                    {t('eventInfo.cannotAttend')}
                  </Button>
                </>
              )}
              {canJoin && (
                <Button className="h-9 rounded-[var(--radius-control)] px-3.5 text-[11.5px]" onClick={handleJoin} disabled={joinPublicEvent.isPending}>
                  {t('eventInfo.join')}
                </Button>
              )}
              {noSpots && <Button className="h-9 rounded-[var(--radius-control)] px-3.5 text-[11.5px]" disabled>{t('eventInfo.noSpots')}</Button>}
            </div>
          )}
        </div>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('eventInfo.deleteDialogTitle')}</DialogTitle>
            <DialogDescription>{t('eventInfo.deleteDialogBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button ref={cancelRef} variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteEvent.isPending}>
              {t('eventInfo.deleteDialogConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MetaItem({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-ink-2">
      <Icon size={14} className="shrink-0 text-ink-3" />
      <span>{children}</span>
    </div>
  )
}
