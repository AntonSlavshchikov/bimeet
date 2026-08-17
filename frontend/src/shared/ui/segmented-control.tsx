import { cn } from '@/shared/lib/cn'
import type { KeyboardEvent, ReactNode } from 'react'

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
  selectionRole?: 'tabs' | 'radio'
  ariaLabel?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  fullWidth,
  size = 'md',
  selectionRole = 'tabs',
  ariaLabel,
}: SegmentedControlProps<T>) {
  function handleRadioKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (selectionRole !== 'radio') return

    const previous = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown'
    if (!previous && !next) return

    event.preventDefault()
    const nextIndex = (index + (previous ? -1 : 1) + options.length) % options.length
    onChange(options[nextIndex].value)
    const radios = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    radios?.[nextIndex]?.focus()
  }

  return (
    <div
      role={selectionRole === 'radio' ? 'radiogroup' : 'tablist'}
      aria-label={ariaLabel}
      className={cn(
        // Прокрутка по горизонтали если набор табов не помещается
        'inline-flex p-[3px] gap-[3px] rounded-[11px] bg-bg-2 max-w-full overflow-x-auto whitespace-nowrap',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        fullWidth && 'flex w-full',
        size === 'sm' && 'p-[2px]',
        className,
      )}
    >
      {options.map((opt, index) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role={selectionRole === 'radio' ? 'radio' : 'tab'}
            aria-selected={selectionRole === 'tabs' ? active : undefined}
            aria-checked={selectionRole === 'radio' ? active : undefined}
            tabIndex={selectionRole === 'radio' ? (active ? 0 : -1) : undefined}
            onClick={() => onChange(opt.value)}
            onKeyDown={event => handleRadioKeyDown(event, index)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 font-medium transition tracking-[-0.005em] cursor-pointer focus-ring',
              size === 'md' ? 'px-[9px] py-1.5 text-[12px] rounded-[8px]' : 'px-2 py-1 text-[11px] rounded-[7px]',
              fullWidth && 'flex-1',
              active
                ? 'bg-surface text-ink font-semibold shadow-[0_1px_4px_rgba(20,20,20,0.06)]'
                : 'text-ink-3 hover:text-ink',
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] font-semibold tnum',
                  active ? 'bg-bg-2 text-ink-2' : 'bg-line-soft text-ink-3',
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
