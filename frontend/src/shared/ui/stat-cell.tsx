import { cn } from '@/shared/lib/cn'

interface StatCellProps {
  value: string | number
  label: string
  className?: string
}

export function StatCell({ value, label, className }: StatCellProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <div className="text-[22px] font-bold tracking-[-0.02em] tnum leading-[1.1] text-ink">{value}</div>
      <div className="text-[11px] font-medium text-ink-3">{label}</div>
    </div>
  )
}
