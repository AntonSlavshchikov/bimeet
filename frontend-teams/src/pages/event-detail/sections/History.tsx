import type { EventDetail } from '@/entities/event/types'
import { formatDateTime } from '@/shared/lib/date'

const fieldLabel: Record<string, string> = {
  title: 'Название',
  description: 'Описание',
  location: 'Место',
  meeting_url: 'Ссылка',
  date_start: 'Начало',
  date_end: 'Конец',
}

export function HistorySection({ event }: { event: EventDetail }) {
  if (event.change_log.length === 0) {
    return <p className="text-[13.5px] text-ink-3 py-2">Изменений пока не было.</p>
  }
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface divide-y divide-line-soft">
      {event.change_log.map(c => (
        <div key={c.id} className="px-4 py-3">
          <div className="text-[13.5px] text-ink-2">
            <span className="font-medium text-ink">{c.changed_by.name}</span> изменил(а)
            {' '}«{fieldLabel[c.field_name] ?? c.field_name}»
          </div>
          <div className="text-[12.5px] text-ink-3 mt-0.5">{formatDateTime(c.changed_at)}</div>
        </div>
      ))}
    </div>
  )
}
