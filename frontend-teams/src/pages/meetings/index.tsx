import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useMatch, useNavigate } from 'react-router-dom'
import { Plus, Calendar } from 'lucide-react'
import { useEvents } from '@/entities/event/queries'
import { useAuth } from '@/features/auth/AuthContext'
import type { EventListItem, ParticipantInfo } from '@/entities/event/types'
import {
  formatTime,
  formatDuration,
  isOngoing,
  isSameLocalDay,
  workWeekDays,
  weekdayShort,
  dayMonthLong,
  meetingPlatform,
} from '@/shared/lib/date'
import { initials } from '@/shared/lib/initials'
import { Spinner } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

// Avatar palette mirrors the mock's a1…a6 accent dots for participant stacks.
const AVATAR_COLORS = ['#6366F1', '#0EA5A4', '#F59E0B', '#EC4899', '#10B981', '#8B5CF6']

function pickDefault(events: EventListItem[]): string | undefined {
  if (events.length === 0) return undefined
  const ongoing = events.find(e => e.status === 'active' && isOngoing(e.date_start, e.date_end))
  return (ongoing ?? events[0]).id
}

export default function MeetingsLayout() {
  const { company } = useAuth()
  const { data: events, isLoading } = useEvents()
  const navigate = useNavigate()
  const detailMatch = useMatch('/events/:id')
  const selectedId = detailMatch?.params.id
  const onRoot = useMatch('/')

  const week = useMemo(() => workWeekDays(), [])
  const todayIdx = Math.max(0, week.findIndex(d => isSameLocalDay(new Date().toISOString(), d)))
  const [dayIdx, setDayIdx] = useState(todayIdx)
  const selectedDay = week[dayIdx] ?? week[0]

  const dayEvents = useMemo(() => {
    if (!events) return []
    return events
      .filter(e => isSameLocalDay(e.date_start, selectedDay))
      .sort((a, b) => a.date_start.localeCompare(b.date_start))
  }, [events, selectedDay])

  // Auto-select the ongoing / first meeting of the day when nothing is open yet.
  useEffect(() => {
    if (onRoot && dayEvents.length > 0) {
      const id = pickDefault(dayEvents)
      if (id) navigate(`/events/${id}`, { replace: true })
    }
  }, [onRoot, dayEvents, navigate])

  function selectDay(idx: number) {
    setDayIdx(idx)
    const next = events?.filter(e => isSameLocalDay(e.date_start, week[idx])).sort((a, b) => a.date_start.localeCompare(b.date_start)) ?? []
    const id = pickDefault(next)
    navigate(id ? `/events/${id}` : '/', { replace: true })
  }

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[340px_1fr] overflow-hidden">
      {/* LIST COLUMN */}
      <section
        className={cn(
          'flex flex-col min-w-0 border-r border-line bg-surface',
          selectedId ? 'hidden md:flex' : 'flex',
        )}
      >
        <div className="px-[18px] pt-[18px] pb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold tracking-[-0.02em] text-ink truncate">
              {company?.name ?? 'Bimeet'} · встречи
            </h1>
            <p className="mt-0.5 text-[12.5px] text-ink-3 capitalize">{dayMonthLong(selectedDay)}</p>
          </div>
          <Link
            to="/events/new"
            title="Создать встречу"
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-[var(--radius-control)] bg-accent text-white"
          >
            <Plus size={17} />
          </Link>
        </div>

        {/* DAY PICKER */}
        <div className="flex gap-1.5 px-[18px] pb-3 border-b border-line-soft">
          {week.map((d, i) => {
            const on = i === dayIdx
            return (
              <button
                key={i}
                onClick={() => selectDay(i)}
                className={cn(
                  'flex-1 text-center py-1.5 rounded-[9px] text-[12px] font-semibold transition',
                  on ? 'bg-accent text-white' : 'text-ink-3 hover:bg-hover',
                )}
              >
                {weekdayShort(d)}
                <span className="block text-[15px] mt-0.5 tnum">{d.getDate()}</span>
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="py-16 flex justify-center"><Spinner className="w-6 h-6" /></div>
          ) : dayEvents.length === 0 ? (
            <div className="py-16 px-4 text-center text-ink-3">
              <Calendar size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-[13px]">На этот день встреч нет</p>
            </div>
          ) : (
            dayEvents.map(ev => <MeetingCard key={ev.id} event={ev} selected={ev.id === selectedId} />)
          )}
        </div>
      </section>

      {/* DETAIL PANEL */}
      <div className={cn('min-w-0 overflow-y-auto', selectedId ? 'block' : 'hidden md:block')}>
        <Outlet />
      </div>
    </div>
  )
}

function MeetingCard({ event, selected }: { event: EventListItem; selected: boolean }) {
  const live = event.status === 'active' && isOngoing(event.date_start, event.date_end)
  const platform = event.meeting_url ? meetingPlatform(event.meeting_url) : ''
  const people = event.participants ?? []
  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'relative grid grid-cols-[46px_1fr] gap-3 p-[11px] rounded-[12px] transition',
        selected ? 'bg-accent/10' : 'hover:bg-hover',
        event.status === 'completed' && !selected && 'opacity-70',
      )}
    >
      {selected && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded bg-accent" />}
      <div className="text-center">
        <div className="text-[13.5px] font-bold tnum text-ink">{formatTime(event.date_start)}</div>
        <div className="text-[10.5px] text-ink-3 mt-0.5">{formatDuration(event.date_start, event.date_end)}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold tracking-[-0.01em] leading-[1.25] text-ink line-clamp-2">
          {event.title}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-ink-3">
          {live && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success ring-2 ring-success/25" /> идёт
            </span>
          )}
          {platform ? (
            <Chip on>{platform}</Chip>
          ) : event.location ? (
            <Chip>{event.location}</Chip>
          ) : null}
        </div>
        {people.length > 0 && <AvatarStack people={people} />}
      </div>
    </Link>
  )
}

function Chip({ children, on }: { children: React.ReactNode; on?: boolean }) {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-1.5 py-px rounded',
        on ? 'text-accent bg-accent/10' : 'text-ink-2 bg-line-soft',
      )}
    >
      {children}
    </span>
  )
}

function AvatarStack({ people }: { people: ParticipantInfo[] }) {
  const shown = people.slice(0, 4)
  const extra = people.length - shown.length
  return (
    <div className="flex mt-1.5">
      {shown.map((p, i) => (
        <span
          key={p.id}
          className="h-5 w-5 rounded-full ring-2 ring-surface text-white text-[8px] font-bold flex items-center justify-center -ml-1.5 first:ml-0"
          style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
          title={p.user.name}
        >
          {initials(p.user.name)}
        </span>
      ))}
      {extra > 0 && (
        <span className="h-5 w-5 rounded-full ring-2 ring-surface bg-bg-2 text-ink-3 text-[8px] font-bold flex items-center justify-center -ml-1.5">
          +{extra}
        </span>
      )}
    </div>
  )
}
