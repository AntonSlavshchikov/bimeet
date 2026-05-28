import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

interface MiniCalendarProps {
  /** Изначально показываемый месяц (ISO YYYY-MM или Date). По умолчанию — текущий. */
  initialMonth?: Date
  /** Текущий «выбранный» день */
  selected?: Date
  /** Множество ISO-дат YYYY-MM-DD, для которых ставится точка-индикатор */
  eventDates?: Set<string>
  onSelect?: (date: Date) => void
  className?: string
}

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function MiniCalendar({
  initialMonth,
  selected,
  eventDates,
  onSelect,
  className,
}: MiniCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => initialMonth ?? today)

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    // в JS воскресенье = 0; в нашей шкале неделя начинается с пн → корректируем
    const startWeekday = (first.getDay() + 6) % 7
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const cells: { date: Date; outOfMonth: boolean }[] = []
    // предыдущий месяц
    for (let i = startWeekday; i > 0; i--) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - i)
      cells.push({ date: d, outOfMonth: true })
    }
    // текущий месяц
    for (let i = 1; i <= lastDay; i++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i), outOfMonth: false })
    }
    // следующий — добиваем до 42 (6 строк)
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outOfMonth: true })
    }
    return cells
  }, [cursor])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <div className="text-[13.5px] font-semibold tracking-[-0.01em]">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-ink transition focus-ring"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-ink transition focus-ring"
            aria-label="Следующий месяц"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-[2px]">
        {WEEKDAYS.map(wd => (
          <div key={wd} className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            {wd}
          </div>
        ))}
        {days.map(({ date, outOfMonth }) => {
          const isToday = sameDay(date, today)
          const isSelected = selected && sameDay(date, selected)
          const hasEvent = eventDates?.has(isoDay(date))
          return (
            <button
              key={isoDay(date)}
              type="button"
              onClick={() => onSelect?.(date)}
              className={cn(
                'relative aspect-square flex items-center justify-center rounded-[7px] text-[12px] font-medium tnum cursor-pointer transition',
                outOfMonth ? 'text-ink-4' : 'text-ink',
                'hover:bg-hover focus-ring',
                isToday && 'bg-accent text-white font-bold hover:bg-accent hover:opacity-92',
                !isToday && isSelected && 'border border-accent text-accent font-bold',
              )}
            >
              {date.getDate()}
              {hasEvent && (
                <span
                  className={cn(
                    'absolute bottom-[3px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
                    isToday ? 'bg-white' : 'bg-accent',
                  )}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
