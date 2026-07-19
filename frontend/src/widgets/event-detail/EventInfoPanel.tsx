import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  CheckCircle2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'
import type { Event } from '@/entities/event/model/types'
import { formatDate, formatTime } from '@/shared/lib/formatDate'
import { useDeleteEvent } from '@/features/event-manage/model/hooks'
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
} from '@/shared/ui'

interface EventInfoPanelProps {
  event: Event
  isOrganizer: boolean
}

function getCalendarParts(iso: string, locale: string) {
  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
  }).formatToParts(new Date(iso))

  return {
    day: parts.find(part => part.type === 'day')?.value ?? '',
    month: parts.find(part => part.type === 'month')?.value ?? '',
  }
}

export default function EventInfoPanel({ event, isOrganizer }: EventInfoPanelProps) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const deleteEvent = useDeleteEvent()

  const myParticipant = event.participants.find(p => p.user?.is_me)
  const isParticipant = !!myParticipant
  const confirmedCount =
    event.confirmed_count ?? event.participants.filter(p => p.status === 'confirmed').length

  const sameDay = formatDate(event.date_start) === formatDate(event.date_end)
  const calendar = getCalendarParts(event.date_start, i18n.resolvedLanguage ?? i18n.language)
  const attendance = event.max_guests != null
    ? t('eventInfo.attendanceCapacity', {
        confirmed: confirmedCount,
        capacity: event.max_guests,
      })
    : t('eventInfo.confirmedCount', { count: confirmedCount })

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
      <article
        aria-labelledby="event-detail-title"
        className="relative isolate overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_22px_60px_rgba(54,42,34,0.08),0_3px_10px_rgba(54,42,34,0.04)]"
      >
        <div className="absolute inset-x-0 top-0 z-10 h-2 bg-[linear-gradient(110deg,var(--color-brand-a)_0%,var(--color-brand-b)_52%,var(--color-brand-c)_100%)]" aria-hidden />
        <div className="p-[18px] pt-[26px] min-[431px]:p-[22px] min-[431px]:pt-[28px] min-[761px]:p-[34px]">
          <div className="grid grid-cols-[62px_minmax(0,1fr)] items-start gap-3.5 min-[431px]:grid-cols-[76px_minmax(0,1fr)_40px] min-[431px]:gap-6">
            <div
              className="grid min-h-[70px] w-[62px] place-content-center rounded-[16px] border border-line bg-[color-mix(in_srgb,var(--color-brand-a)_5%,var(--color-surface))] text-center min-[431px]:min-h-[84px] min-[431px]:w-[76px] min-[431px]:rounded-[20px]"
              aria-label={`${calendar.day} ${calendar.month}`}
            >
              <span className="text-[28px] font-extrabold leading-[0.95] tracking-[-0.05em] text-ink min-[431px]:text-[34px]">
                {calendar.day}
              </span>
              <span className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.11em] text-[var(--color-brand-a)]">
                {calendar.month}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex min-h-[25px] flex-wrap items-center gap-[7px] pr-10 min-[431px]:pr-0">
                {event.status === 'completed' ? (
                  <StatusPill variant="completed" size="sm" className="min-h-[25px] px-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {t('eventInfo.statusCompleted')}
                  </StatusPill>
                ) : isOrganizer ? (
                  <StatusPill variant="host" size="sm" className="min-h-[25px] px-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {t('eventInfo.statusHost')}
                  </StatusPill>
                ) : myParticipant?.status === 'confirmed' ? (
                  <StatusPill variant="going" size="sm" className="min-h-[25px] px-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {t('eventInfo.statusGoing')}
                  </StatusPill>
                ) : myParticipant?.status === 'declined' ? (
                  <StatusPill variant="declined" size="sm" className="min-h-[25px] px-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {t('eventInfo.statusDeclined')}
                  </StatusPill>
                ) : isParticipant ? (
                  <StatusPill variant="invited" size="sm" className="min-h-[25px] px-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {t('eventInfo.statusPending')}
                  </StatusPill>
                ) : null}

                {event.is_public && (
                  <StatusPill variant="neutral" size="sm" className="min-h-[25px] px-[9px]">
                    {t('publicEvents.publicBadge')}
                  </StatusPill>
                )}

                {event.dress_code && (
                  <StatusPill variant="neutral" size="sm" className="min-h-[25px] max-w-full px-[9px]">
                    <span className="truncate">{event.dress_code}</span>
                  </StatusPill>
                )}
              </div>

              <h1
                id="event-detail-title"
                className="mt-[13px] text-[clamp(28px,4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink"
              >
                {event.title}
              </h1>

              {event.description && (
                <p className="mt-[13px] max-w-[720px] whitespace-pre-wrap text-[13px] leading-[1.65] text-ink-2 min-[431px]:text-[14px]">
                  {event.description}
                </p>
              )}
            </div>

            {isOrganizer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('eventInfo.menuActions')}
                    className="focus-ring absolute right-4 top-5 inline-flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-surface/80 text-ink-2 transition hover:-translate-y-px hover:bg-surface hover:text-ink min-[431px]:static"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {event.status === 'active' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate(`/events/${event.id}/edit`)}>
                        <Pencil size={14} className="text-ink-3" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem destructive onClick={() => setDeleteOpen(true)}>
                    <Trash2 size={14} />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {event.status === 'completed' && (
            <div className="mt-[18px] flex items-center gap-2.5 rounded-[14px] border border-warning/20 bg-warning/10 px-3.5 py-3 text-[12px] leading-[1.45] text-warning">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>
                {t('eventInfo.completedNote', {
                  date: formatDate(event.date_end),
                  time: formatTime(event.date_end),
                })}
              </span>
            </div>
          )}

          <div className="mt-7 grid grid-cols-1 gap-3 min-[641px]:grid-cols-[1fr_1.3fr_0.8fr]" aria-label={t('eventInfo.mainInformation')}>
            <div className="grid min-h-[68px] grid-cols-[36px_minmax(0,1fr)] items-center gap-[11px] rounded-[16px] border border-line bg-bg-2/80 p-3">
              <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[color-mix(in_srgb,var(--color-brand-b)_10%,transparent)] text-[var(--color-brand-b)]">
                <Calendar size={17} />
              </span>
              <div className="min-w-0">
                <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">{t('eventInfo.when')}</div>
                <div className="mt-[3px] text-[12px] font-normal leading-[1.35] text-ink">
                  {sameDay
                    ? `${formatDate(event.date_start)} · ${formatTime(event.date_start)}–${formatTime(event.date_end)}`
                    : `${formatDate(event.date_start)} — ${formatDate(event.date_end)}`}
                </div>
              </div>
            </div>

            <div className="grid min-h-[68px] grid-cols-[36px_minmax(0,1fr)] items-center gap-[11px] rounded-[16px] border border-line bg-bg-2/80 p-3">
              <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[color-mix(in_srgb,var(--color-brand-b)_10%,transparent)] text-[var(--color-brand-b)]">
                <MapPin size={17} />
              </span>
              <div className="min-w-0">
                <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">{t('eventInfo.where')}</div>
                <div className="mt-[3px] break-words text-[12px] font-normal leading-[1.35] text-ink">{event.location || '—'}</div>
              </div>
            </div>

            <div className="grid min-h-[68px] grid-cols-[36px_minmax(0,1fr)] items-center gap-[11px] rounded-[16px] border border-line bg-bg-2/80 p-3">
              <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[color-mix(in_srgb,var(--color-brand-b)_10%,transparent)] text-[var(--color-brand-b)]">
                <Users size={17} />
              </span>
              <div className="min-w-0">
                <div className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-3">{t('tabs.participants')}</div>
                <div className="mt-[3px] text-[12px] font-normal leading-[1.35] text-ink">{attendance}</div>
              </div>
            </div>
          </div>

        </div>
      </article>

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
