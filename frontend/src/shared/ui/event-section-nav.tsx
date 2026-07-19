import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export interface EventSectionOption<T extends string> {
  key: T
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  badge?: number
  count?: number
}

interface EventSectionNavProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: EventSectionOption<T>[]
  action?: ReactNode
  label: string
  description?: string
  children?: ReactNode
  className?: string
  contentClassName?: string
}

export function EventSectionNav<T extends string>({
  value,
  onChange,
  options,
  action,
  label,
  description,
  children,
  className,
  contentClassName,
}: EventSectionNavProps<T>) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[24px] border border-line bg-surface shadow-[0_22px_60px_rgba(54,42,34,0.08),0_3px_10px_rgba(54,42,34,0.04)]',
        className,
      )}
    >
      <div className="flex min-h-[76px] flex-col items-stretch justify-between gap-4 px-[18px] pb-3.5 pt-5 min-[761px]:flex-row min-[761px]:items-center min-[761px]:px-6 min-[761px]:pb-4 min-[761px]:pt-[22px]">
        <div className="min-w-0">
          <div className="text-[17px] font-bold tracking-[-0.025em] text-ink">{label}</div>
          {description && <div className="mt-1 text-[11px] text-ink-3">{description}</div>}
        </div>
        {action}
      </div>

      <div className="border-b border-line px-[18px] min-[641px]:px-6">
        <div
          role="tablist"
          aria-label={label}
          className="flex gap-[5px] overflow-x-auto pb-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {options.map(option => {
            const selected = option.key === value
            const Icon = option.icon
            const displayedCount = option.badge ?? option.count
            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-label={option.label}
                aria-selected={selected}
                aria-pressed={selected}
                onClick={() => onChange(option.key)}
                className={cn(
                  'focus-ring inline-flex min-h-[38px] shrink-0 items-center justify-center gap-[7px] rounded-[12px] px-3 text-[11px] font-semibold text-ink-3 transition hover:-translate-y-px hover:text-ink',
                  selected && 'brand-gradient text-white hover:text-white',
                )}
              >
                <Icon size={15} aria-hidden />
                <span>{option.label}</span>
                {displayedCount != null && displayedCount > 0 && (
                  <span
                    className={cn(
                      'inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-line-soft px-1.5 text-[9px] font-bold tnum',
                      selected && 'bg-white/20 text-white',
                    )}
                  >
                    {displayedCount > 99 ? '99+' : displayedCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {children && (
        <div className={cn('px-[18px] py-[22px] min-[761px]:px-6 min-[761px]:py-[25px]', contentClassName)}>
          {children}
        </div>
      )}
    </section>
  )
}
