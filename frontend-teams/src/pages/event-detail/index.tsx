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
import { ParticipantsSection } from './sections/Participants'
import { LinksSection } from './sections/Links'
import { PollsSection } from './sections/Polls'
import { HistorySection } from './sections/History'

type Tab = 'participants' | 'links' | 'polls' | 'history'

export default function EventDetailPage() {
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
    <div className="flex flex-col gap-5">
      <Button variant="ghost" asChild className="self-start -ml-2 h-9">
        <Link to="/"><ArrowLeft size={15} /> К встречам</Link>
      </Button>

      {/* Info card */}
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[20px] font-bold tracking-[-0.01em] text-ink">{event.title}</h1>
              {!active && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-bg-2 text-ink-3">Завершена</span>
              )}
            </div>
            {event.description && <p className="mt-2 text-[14px] text-ink-2 whitespace-pre-wrap">{event.description}</p>}
          </div>
          {isOrganizer && active && (
            <div className="flex items-center gap-1 shrink-0">
              <Button asChild variant="ghost" className="h-9 w-9 px-0"><Link to={`/events/${id}/edit`}><Pencil size={15} /></Link></Button>
              <button onClick={() => completeEvent.mutate()} title="Завершить"
                className="h-9 w-9 inline-flex items-center justify-center rounded-[var(--radius-control)] text-ink-2 hover:bg-hover">
                <CheckCircle2 size={16} />
              </button>
              <button onClick={() => setConfirmDelete(true)} title="Удалить"
                className="h-9 w-9 inline-flex items-center justify-center rounded-[var(--radius-control)] text-danger hover:bg-hover">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 text-[13.5px] text-ink-2">
          <Meta icon={<Calendar size={15} />}>{formatDate(event.date_start)}</Meta>
          <Meta icon={<Clock size={15} />}>{formatTime(event.date_start)} – {formatTime(event.date_end)}</Meta>
          {event.location && <Meta icon={<MapPin size={15} />}>{event.location}</Meta>}
          {event.meeting_url && (
            <Meta icon={<Video size={15} />}>
              <a href={event.meeting_url} target="_blank" rel="noreferrer" className="text-accent hover:underline break-all">
                {event.meeting_url}
              </a>
            </Meta>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between">
          <span className="text-[13px] text-ink-3">
            Организатор: <span className="text-ink-2 font-medium">{event.organizer.name}</span> · {event.confirmed_count} подтвердили
          </span>
          {me && !isOrganizer && active && <RsvpButtons status={me.status} onSet={s => m.setMyStatus.mutate(s)} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'h-9 px-3 text-[13.5px] font-medium -mb-px border-b-2 transition',
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-ink-3 hover:text-ink-2',
            )}>
            {t.label}{t.count ? ` · ${t.count}` : ''}
          </button>
        ))}
      </div>

      <div>
        {tab === 'participants' && <ParticipantsSection event={event} isOrganizer={isOrganizer} active={active} m={m} />}
        {tab === 'links' && <LinksSection event={event} userId={user?.id} isOrganizer={isOrganizer} active={active} m={m} />}
        {tab === 'polls' && <PollsSection event={event} userId={user?.id} active={active} m={m} />}
        {tab === 'history' && <HistorySection event={event} />}
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
    <div className="flex items-center gap-2">
      <span className="text-ink-3">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function RsvpButtons({ status, onSet }: { status: string; onSet: (s: 'confirmed' | 'declined') => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onSet('confirmed')}
        className={cn('h-8 px-3 rounded-[var(--radius-control)] text-[13px] font-semibold transition',
          status === 'confirmed' ? 'bg-success text-white' : 'border border-line text-ink-2 hover:bg-hover')}>
        Иду
      </button>
      <button onClick={() => onSet('declined')}
        className={cn('h-8 px-3 rounded-[var(--radius-control)] text-[13px] font-semibold transition',
          status === 'declined' ? 'bg-danger text-white' : 'border border-line text-ink-2 hover:bg-hover')}>
        Не иду
      </button>
    </div>
  )
}
