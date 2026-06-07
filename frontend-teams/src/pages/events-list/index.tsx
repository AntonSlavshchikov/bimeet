import { Link } from 'react-router-dom'
import { Plus, Video, MapPin, Calendar } from 'lucide-react'
import { useEvents } from '@/entities/event/queries'
import type { EventListItem } from '@/entities/event/types'
import { formatDateTime } from '@/shared/lib/date'
import { Button, Spinner } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

const statusLabel: Record<string, string> = {
  invited: 'Приглашены',
  confirmed: 'Вы идёте',
  declined: 'Вы отказались',
}

export default function EventsListPage() {
  const { data: events, isLoading } = useEvents()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">Встречи</h1>
        <Button asChild>
          <Link to="/events/new">
            <Plus size={15} /> Создать
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner className="w-7 h-7" />
        </div>
      ) : !events || events.length === 0 ? (
        <div className="py-20 text-center text-ink-3">
          <Calendar size={28} className="mx-auto mb-3 opacity-50" />
          <p className="text-[14px]">Встреч пока нет</p>
          <p className="text-[13px] mt-1">Создайте первую — пригласите коллег и добавьте повестку.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map(ev => (
            <EventRow key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  )
}

// Button supports asChild via a tiny shim — fall back to plain <a> styling here.
function EventRow({ event }: { event: EventListItem }) {
  const completed = event.status === 'completed'
  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'rounded-[var(--radius-card)] border border-line bg-surface p-4 transition hover:bg-hover',
        completed && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-ink truncate">{event.title}</span>
            {completed && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-bg-2 text-ink-3">
                Завершена
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
            <span className="inline-flex items-center gap-1 tnum">
              <Calendar size={13} /> {formatDateTime(event.date_start)}
            </span>
            {event.meeting_url ? (
              <span className="inline-flex items-center gap-1">
                <Video size={13} /> Онлайн
              </span>
            ) : event.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {event.location}
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-right shrink-0">
          {event.my_status && statusLabel[event.my_status] && (
            <div
              className={cn(
                'text-[12px] font-semibold',
                event.my_status === 'confirmed' && 'text-success',
                event.my_status === 'declined' && 'text-danger',
                event.my_status === 'invited' && 'text-accent',
              )}
            >
              {statusLabel[event.my_status]}
            </div>
          )}
          <div className="text-[12px] text-ink-3 mt-0.5">{event.confirmed_count} идут</div>
        </div>
      </div>
    </Link>
  )
}
