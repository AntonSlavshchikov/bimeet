import { cn } from '@/shared/lib/cn'
import type { ReactNode } from 'react'

interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  count?: number | string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (next: T) => void
  options: SegmentedOption<T>[]
  className?: string
  fullWidth?: boolean
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  fullWidth,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        // Прокрутка по горизонтали если набор табов не помещается
        'inline-flex p-[3px] gap-[2px] rounded-[9px] bg-bg-2 max-w-full overflow-x-auto whitespace-nowrap',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        fullWidth && 'flex w-full',
        size === 'sm' && 'p-[2px]',
        className,
      )}
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 font-medium transition tracking-[-0.005em] cursor-pointer focus-ring',
              size === 'md' ? 'px-3 py-1.5 text-[13px] rounded-[7px]' : 'px-2.5 py-1 text-[12px] rounded-[6px]',
              fullWidth && 'flex-1',
              active
                ? 'bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.04)]'
                : 'text-ink-2 hover:text-ink',
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] font-semibold tnum',
                  active ? 'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-accent' : 'bg-line-soft text-ink-3',
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
