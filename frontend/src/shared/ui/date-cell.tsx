import { cn } from '@/shared/lib/cn'

interface DateCellProps {
  /** День месяца, например 12 */
  day: number | string
  /** Короткое слово: «ср», «июн» */
  caption?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/** День крупно + caption мелким сверху-низом (день недели / месяц). Стандартный размер md = 22px цифра. */
export function DateCell({ day, caption, size = 'md', className }: DateCellProps) {
  const dim = size === 'sm'
    ? { d: 'text-[18px]', c: 'text-[10px]' }
    : size === 'lg'
      ? { d: 'text-[28px]', c: 'text-[11px]' }
      : { d: 'text-[22px]', c: 'text-[10px]' }
  return (
    <div className={cn('flex flex-col items-center text-ink', className)}>
      <div className={cn(dim.d, 'font-bold leading-none tracking-[-0.02em] tnum')}>{day}</div>
      {caption && (
        <div className={cn(dim.c, 'mt-1 font-semibold uppercase tracking-[0.08em] text-ink-3')}>
          {caption}
        </div>
      )}
    </div>
  )
}
