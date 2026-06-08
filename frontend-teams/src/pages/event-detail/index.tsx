import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, MapPin, Pencil, Trash2, Video, CheckCircle2 } from 'lucide-react'
import { useEvent } from '@/entities/event/queries'
import { useAuth } from '@/features/auth/AuthContext'
import { useDeleteEvent, useCompleteEvent } from '@/features/event-manage/hooks'
import { useEventDetailMutations } from '@/features/event-detail/hooks'
import { formatDate, formatTime } from '@/shared/lib/date'
import { Button, Spinner, ConfirmModal } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import type { PollInfo } from '@/entities/event/types'
import { ParticipantsSection } from './sections/Participants'
import { LinksSection } from './sections/Links'
import { PollsSection } from './sections/Polls'
import { HistorySection } from './sections/History'

type Tab = 'participants' | 'links' | 'polls' | 'history'

export default function EventDetailPanel() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: event, isLoading } = useEvent(id)
  const deleteEvent = useDeleteEvent(id)
  const completeEvent = useCompleteEvent(id)
  const m = useEventDetailMutations(id)

  const [tab, setTab] = useState<Tab>('participants')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return <div className="py-20 flex justify-center"><Spinner className="w-7 h-7" /></div>
  }
  if (!event) {
    return (
      <div className="py-20 text-center text-ink-3">
        <p>Встреча не найдена</p>
        <Button asChild variant="ghost" className="mt-3"><Link to="/">К списку</Link></Button>
      </div>
    )
  }

  const isOrganizer = event.organizer.id === user?.id
  const me = event.participants.find(p => p.user.id === user?.id)
  const active = event.status === 'active'

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'participants', label: 'Участники', count: event.participants.length },
    { key: 'links', label: 'Материалы', count: event.links.length },
    { key: 'polls', label: 'Опросы', count: event.polls.length },
    { key: 'history', label: 'История', count: event.change_log.length },
  ]

  return (
    <div className="px-6 lg:px-8 py-6">
      {/* Mobile back to list */}
      <Link to="/" className="md:hidden inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 mb-4 -ml-1">
        <ArrowLeft size={15} /> К встречам
      </Link>

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[24px] font-bold tracking-[-0.02em] leading-tight text-ink">{event.title}</h2>
            {!active && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-bg-2 text-ink-3">Завершена</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13.5px] text-ink-2">
            <Meta icon={<Clock size={15} />}>
              {formatDate(event.date_start)}, {formatTime(event.date_start)}–{formatTime(event.date_end)}
            </Meta>
            {event.meeting_url && (
              <Meta icon={<Video size={15} />}>
                <a href={event.meeting_url} target="_blank" rel="noreferrer" className="text-accent font-medium hover:underline break-all">
                  {prettyUrl(event.meeting_url)}
                </a>
              </Meta>
            )}
            {event.location && <Meta icon={<MapPin size={15} />}>{event.location}</Meta>}
            <Meta icon={<Calendar size={15} />}>
              Организатор: <span className="text-ink">{isOrganizer ? 'вы' : event.organizer.name}</span>
            </Meta>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {event.meeting_url && active && (
            <a
              href={event.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="h-[42px] px-5 rounded-[11px] bg-accent text-white text-[14px] font-bold inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Video size={17} /> Подключиться
            </a>
          )}
          {isOrganizer && active && (
            <>
              <IconBtn title="Редактировать" onClick={() => navigate(`/events/${id}/edit`)}>
                <Pencil size={16} />
              </IconBtn>
              <IconBtn title="Завершить" onClick={() => completeEvent.mutate()}>
                <CheckCircle2 size={16} />
              </IconBtn>
              <IconBtn title="Удалить" danger onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} />
              </IconBtn>
            </>
          )}
        </div>
      </div>

      {me && !isOrganizer && active && (
        <div className="mt-4">
          <RsvpButtons status={me.status} onSet={s => m.setMyStatus.mutate(s)} />
        </div>
      )}

      {/* TABS */}
      <div className="flex items-center gap-1 mt-6 border-b border-line">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3.5 py-2.5 text-[13.5px] font-semibold -mb-px border-b-2 transition',
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-ink-3 hover:text-ink-2',
            )}
          >
            {t.label}
            {t.count ? <span className="ml-1.5 text-[11px] text-ink-3">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {/* PANE */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-7 pt-5">
        <div className="min-w-0">
          {tab === 'participants' && <ParticipantsSection event={event} isOrganizer={isOrganizer} active={active} m={m} />}
          {tab === 'links' && <LinksSection event={event} userId={user?.id} isOrganizer={isOrganizer} active={active} m={m} />}
          {tab === 'polls' && <PollsSection event={event} userId={user?.id} active={active} m={m} />}
          {tab === 'history' && <HistorySection event={event} />}
        </div>

        <aside className="flex flex-col gap-4">
          {tab !== 'polls' && event.polls[0] && <PollMini poll={event.polls[0]} userId={user?.id} />}
          <SideCard title="Повестка">
            {event.description ? (
              <p className="text-[13px] text-ink-2 whitespace-pre-wrap leading-relaxed">{event.description}</p>
            ) : (
              <p className="text-[13px] text-ink-3">Описание не добавлено.</p>
            )}
          </SideCard>
        </aside>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Удалить встречу?"
        body="Встреча и все связанные данные будут удалены безвозвратно."
        confirmLabel="Удалить"
        danger
        loading={deleteEvent.isPending}
        onConfirm={() => deleteEvent.mutate(undefined, { onSuccess: () => navigate('/') })}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-ink-3">{icon}</span>
      <span>{children}</span>
    </span>
  )
}

function IconBtn({
  children,
  title,
  danger,
  onClick,
}: {
  children: React.ReactNode
  title: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'h-[38px] w-[38px] inline-flex items-center justify-center rounded-[10px] border border-line transition hover:bg-hover',
        danger ? 'text-danger' : 'text-ink-2',
      )}
    >
      {children}
    </button>
  )
}

function RsvpButtons({ status, onSet }: { status: string; onSet: (s: 'confirmed' | 'declined') => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onSet('confirmed')}
        className={cn(
          'h-8 px-3 rounded-[var(--radius-control)] text-[13px] font-semibold transition',
          status === 'confirmed' ? 'bg-success text-white' : 'border border-line text-ink-2 hover:bg-hover',
        )}
      >
        Иду
      </button>
      <button
        onClick={() => onSet('declined')}
        className={cn(
          'h-8 px-3 rounded-[var(--radius-control)] text-[13px] font-semibold transition',
          status === 'declined' ? 'bg-danger text-white' : 'border border-line text-ink-2 hover:bg-hover',
        )}
      >
        Не иду
      </button>
    </div>
  )
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-ink-3 mb-2.5">{title}</div>
      {children}
    </div>
  )
}

// PollMini is a compact, read-only preview of the top poll in the side rail;
// voting happens in the Опросы tab.
function PollMini({ poll, userId }: { poll: PollInfo; userId?: string }) {
  const total = poll.options.reduce((s, o) => s + o.votes.length, 0)
  const myOption = poll.options.find(o => userId && o.votes.includes(userId))?.id
  return (
    <SideCard title="Опрос">
      <div className="text-[13.5px] font-semibold text-ink mb-2.5">{poll.question}</div>
      <div className="flex flex-col gap-1.5">
        {poll.options.map(o => {
          const pct = total ? Math.round((o.votes.length / total) * 100) : 0
          const mine = o.id === myOption
          return (
            <div
              key={o.id}
              className={cn('relative overflow-hidden rounded-[9px] border px-2.5 py-2', mine ? 'border-accent' : 'border-line')}
            >
              <span className="absolute inset-y-0 left-0 bg-accent/10" style={{ width: `${pct}%` }} aria-hidden />
              <span className="relative flex items-center justify-between text-[12.5px]">
                <span className={cn(mine ? 'font-bold text-accent' : 'text-ink-2')}>{o.label}</span>
                <span className="text-ink-3 tnum">{o.votes.length} · {pct}%</span>
              </span>
            </div>
          )
        })}
      </div>
    </SideCard>
  )
}

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
