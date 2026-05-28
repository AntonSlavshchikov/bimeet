import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

/** Bg-2 карточка для правой панели (UpNext, MiniCalendar, Stats) */
export const RailCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-[12px] bg-bg-2 p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)
RailCard.displayName = 'RailCard'

interface RailCardTitleProps extends HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode
}

export function RailCardTitle({ className, children, action, ...props }: RailCardTitleProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)} {...props}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{children}</div>
      {action}
    </div>
  )
}
