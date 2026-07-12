import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DateRangePickerProps {
  startDate?: string
  endDate?: string
  onChange: (range: { startDate: string; endDate: string }) => void
  placeholder: string
  clearLabel: string
  previousMonthLabel: string
  nextMonthLabel: string
  locale?: string
  required?: boolean
  className?: string
}

const WEEK_START_OFFSET = 6

function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseIsoDay(value?: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isBeforeDay(a: Date, b: Date): boolean {
  return dayTime(a) < dayTime(b)
}

function dayTime(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function isInRange(day: Date, start?: Date, end?: Date): boolean {
  if (!start || !end) return false
  const time = dayTime(day)
  const startTime = dayTime(start)
  const endTime = dayTime(end)
  return time > startTime && time < endTime
}

function isInPreviewRange(day: Date, start?: Date, hover?: Date): boolean {
  if (!start || !hover || isSameDay(start, hover)) return false
  const time = dayTime(day)
  const startTime = dayTime(start)
  const hoverTime = dayTime(hover)
  const from = Math.min(startTime, hoverTime)
  const to = Math.max(startTime, hoverTime)
  return time >= from && time <= to && time !== startTime
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder,
  clearLabel,
  previousMonthLabel,
  nextMonthLabel,
  locale = 'ru-RU',
  required,
  className,
}: DateRangePickerProps) {
  const today = useMemo(() => new Date(), [])
  const selectedStart = parseIsoDay(startDate)
  const selectedEnd = parseIsoDay(endDate)
  const [cursor, setCursor] = useState(() => selectedStart ?? today)
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>()

  useEffect(() => {
    const nextStart = parseIsoDay(startDate)
    if (nextStart) setCursor(nextStart)
  }, [startDate])

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale],
  )
  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    [locale],
  )
  const weekdayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    [locale],
  )

  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      return weekdayFormatter.format(date).replace('.', '')
    })
  }, [weekdayFormatter])

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const startWeekday = (first.getDay() + WEEK_START_OFFSET) % 7
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const cells: { date: Date; outOfMonth: boolean }[] = []

    for (let i = startWeekday; i > 0; i--) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), 1 - i), outOfMonth: true })
    }

    for (let day = 1; day <= lastDay; day++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), outOfMonth: false })
    }

    while (cells.length < 42) {
      const last = cells[cells.length - 1].date
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outOfMonth: true })
    }

    return cells
  }, [cursor])

  const label = selectedStart
    ? selectedEnd
      ? `${dayFormatter.format(selectedStart)} - ${dayFormatter.format(selectedEnd)}`
      : dayFormatter.format(selectedStart)
    : placeholder

  function selectDay(day: Date) {
    const iso = toIsoDay(day)
    setHoveredDate(undefined)

    if (!selectedStart || selectedEnd) {
      onChange({ startDate: iso, endDate: '' })
      return
    }

    if (isBeforeDay(day, selectedStart)) {
      onChange({ startDate: iso, endDate: toIsoDay(selectedStart) })
      return
    }

    onChange({ startDate: toIsoDay(selectedStart), endDate: iso })
  }

  return (
    <Popover>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-9 w-full items-center justify-between gap-2 rounded-[9px] bg-bg-2 px-3 text-left text-[13.5px] text-ink',
              'border border-transparent transition outline-none focus-ring',
              'hover:bg-hover focus:bg-surface focus:border-accent',
              !selectedStart && 'text-ink-3',
            )}
            aria-required={required}
          >
            <span className={cn('flex min-w-0 items-center gap-2', selectedStart && 'pr-7')}>
              <Calendar size={14} className="shrink-0 text-ink-3" />
              <span className="truncate">{label}</span>
            </span>
            <ChevronDown size={14} className="shrink-0 text-ink-3" />
          </button>
        </PopoverTrigger>

        {selectedStart && (
          <button
            type="button"
            onClick={() => onChange({ startDate: '', endDate: '' })}
            className="absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[6px] text-ink-3 transition hover:bg-hover hover:text-ink focus-ring"
            aria-label={clearLabel}
          >
            <X size={13} />
          </button>
        )}
      </div>

      <PopoverContent className="w-[min(calc(100vw-32px),336px)] p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[13.5px] font-semibold text-ink">
              {monthFormatter.format(cursor)}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-ink-3 transition hover:bg-hover hover:text-ink focus-ring"
                aria-label={previousMonthLabel}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-ink-3 transition hover:bg-hover hover:text-ink focus-ring"
                aria-label={nextMonthLabel}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-[2px]" onMouseLeave={() => setHoveredDate(undefined)}>
            {weekdays.map(day => (
              <div key={day} className="py-1 text-center text-[10px] font-semibold uppercase text-ink-3">
                {day}
              </div>
            ))}

            {days.map(({ date, outOfMonth }) => {
              const selectedAsStart = selectedStart && isSameDay(date, selectedStart)
              const selectedAsEnd = selectedEnd && isSameDay(date, selectedEnd)
              const ranged = isInRange(date, selectedStart, selectedEnd)
              const previewed = !selectedEnd && isInPreviewRange(date, selectedStart, hoveredDate)
              const current = isSameDay(date, today)

              return (
                <button
                  key={toIsoDay(date)}
                  type="button"
                  onClick={() => selectDay(date)}
                  onFocus={() => setHoveredDate(date)}
                  onMouseEnter={() => setHoveredDate(date)}
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-[7px] text-[12px] font-medium tnum transition focus-ring',
                    outOfMonth ? 'text-ink-4' : 'text-ink',
                    'hover:bg-hover',
                    (ranged || previewed) && 'bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-accent',
                    current && !selectedAsStart && !selectedAsEnd && 'font-bold text-accent',
                    (selectedAsStart || selectedAsEnd) && 'bg-accent text-white font-bold hover:bg-accent hover:opacity-92',
                  )}
                  aria-label={dayFormatter.format(date)}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
