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
  minDate?: string
  selectionMode?: 'single' | 'range'
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
  minDate,
  selectionMode = 'range',
  className,
}: DateRangePickerProps) {
  const today = useMemo(() => new Date(), [])
  const selectedStart = parseIsoDay(startDate)
  const selectedEnd = parseIsoDay(endDate)
  const minimumDate = parseIsoDay(minDate)
  const [cursor, setCursor] = useState(() =>
    minimumDate && (!selectedStart || isBeforeDay(selectedStart, minimumDate))
      ? minimumDate
      : selectedStart ?? today,
  )
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const nextStart = parseIsoDay(startDate)
    const nextMinimum = parseIsoDay(minDate)
    if (nextMinimum && (!nextStart || isBeforeDay(nextStart, nextMinimum))) {
      setCursor(nextMinimum)
    } else if (nextStart) {
      setCursor(nextStart)
    }
  }, [startDate, minDate])

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
    ? selectedEnd && selectionMode === 'range' && !isSameDay(selectedStart, selectedEnd)
      ? `${dayFormatter.format(selectedStart)} – ${dayFormatter.format(selectedEnd)}`
      : dayFormatter.format(selectedStart)
    : placeholder

  const monthLabel = monthFormatter.format(cursor)
  const capitalizedMonthLabel = monthLabel.charAt(0).toLocaleUpperCase(locale) + monthLabel.slice(1)

  function selectDay(day: Date) {
    if (minimumDate && isBeforeDay(day, minimumDate)) return

    const iso = toIsoDay(day)
    setHoveredDate(undefined)

    if (selectionMode === 'single') {
      onChange({ startDate: iso, endDate: iso })
      setOpen(false)
      return
    }

    if (!selectedStart || selectedEnd || (minimumDate && isBeforeDay(selectedStart, minimumDate))) {
      onChange({ startDate: iso, endDate: '' })
      return
    }

    if (isBeforeDay(day, selectedStart)) {
      onChange({ startDate: iso, endDate: toIsoDay(selectedStart) })
      setOpen(false)
      return
    }

    onChange({ startDate: toIsoDay(selectedStart), endDate: iso })
    setOpen(false)
  }

  const previousMonthLastDay = new Date(cursor.getFullYear(), cursor.getMonth(), 0)
  const previousMonthDisabled = Boolean(minimumDate && isBeforeDay(previousMonthLastDay, minimumDate))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-control)] bg-bg-2 px-3 text-left text-[13.5px] text-ink',
              'border border-transparent transition outline-none focus-ring',
              'hover:bg-hover focus:bg-surface focus:border-accent',
              open && 'border-accent bg-surface shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_14%,transparent)]',
              !selectedStart && 'text-ink-3',
            )}
            aria-required={required}
          >
            <span className={cn('flex min-w-0 items-center gap-2', selectedStart && 'pr-7')}>
              <Calendar size={14} className="shrink-0 text-ink-3" />
              <span className="truncate">{label}</span>
            </span>
            <ChevronDown
              size={14}
              className={cn('shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-180')}
            />
          </button>
        </PopoverTrigger>

        {selectedStart && (
          <button
            type="button"
            onClick={() => {
              onChange({ startDate: '', endDate: '' })
              setOpen(false)
            }}
            className="absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[7px] text-ink-3 transition hover:bg-hover hover:text-ink focus-ring"
            aria-label={clearLabel}
          >
            <X size={13} />
          </button>
        )}
      </div>

      <PopoverContent
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(calc(100vw-24px),336px)] overflow-hidden rounded-[18px] border-line bg-surface p-0 shadow-[0_20px_56px_-24px_rgba(34,26,20,0.34)] sm:w-[356px]"
      >
        <div className="h-1 bg-[linear-gradient(90deg,var(--color-brand-a),var(--color-brand-b),var(--color-brand-c))]" />
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-line-soft bg-[color-mix(in_srgb,var(--color-bg-2)_58%,var(--color-surface))] px-4 py-3.5">
            <div className="text-[14px] font-bold tracking-[-0.015em] text-ink">
              {capitalizedMonthLabel}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                disabled={previousMonthDisabled}
                className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-3 transition hover:bg-hover hover:text-ink focus-ring disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-surface disabled:hover:text-ink-3"
                aria-label={previousMonthLabel}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-3 transition hover:bg-hover hover:text-ink focus-ring"
                aria-label={nextMonthLabel}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div
            className="grid grid-cols-7 gap-1 p-3 pt-2.5"
            onMouseLeave={() => setHoveredDate(undefined)}
          >
            {weekdays.map((day, index) => (
              <div
                key={day}
                className={cn(
                  'py-1.5 text-center text-[9.5px] font-bold uppercase tracking-[0.06em] text-ink-3',
                  index >= 5 && 'text-danger',
                )}
              >
                {day}
              </div>
            ))}

            {days.map(({ date, outOfMonth }, index) => {
              const selectedAsStart = selectedStart && isSameDay(date, selectedStart)
              const selectedAsEnd = selectedEnd && isSameDay(date, selectedEnd)
              const ranged = isInRange(date, selectedStart, selectedEnd)
              const previewed = !selectedEnd && isInPreviewRange(date, selectedStart, hoveredDate)
              const current = isSameDay(date, today)
              const weekend = index % 7 >= 5
              const disabled = Boolean(minimumDate && isBeforeDay(date, minimumDate))

              return (
                <button
                  key={toIsoDay(date)}
                  type="button"
                  onClick={() => selectDay(date)}
                  onFocus={() => !disabled && setHoveredDate(date)}
                  onMouseEnter={() => !disabled && setHoveredDate(date)}
                  disabled={disabled}
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-[10px] text-[12px] font-semibold tnum transition focus-ring',
                    outOfMonth
                      ? weekend ? 'text-danger opacity-40' : 'text-ink-4'
                      : weekend ? 'text-danger' : 'text-ink',
                    'hover:bg-hover',
                    (ranged || previewed) && 'brand-gradient-soft text-accent',
                    current && !selectedAsStart && !selectedAsEnd && 'ring-1 ring-inset ring-accent text-accent',
                    (selectedAsStart || selectedAsEnd) && 'brand-gradient text-white font-bold hover:opacity-92',
                    disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                  )}
                  aria-label={dayFormatter.format(date)}
                  aria-pressed={Boolean(selectedAsStart || selectedAsEnd)}
                  aria-current={current ? 'date' : undefined}
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
