import { cn } from '@/shared/lib/cn'

interface TimeCellProps {
  time: string
  place?: string
  className?: string
}

export function TimeCell({ time, place, className }: TimeCellProps) {
  return (
    <div className={cn('flex flex-col gap-0.5 tnum min-w-0', className)}>
      <div className="text-[13.5px] font-semibold text-ink tracking-[-0.01em]">{time}</div>
      {place && (
        <div className="text-[12px] text-ink-3 truncate">{place}</div>
      )}
    </div>
  )
}
