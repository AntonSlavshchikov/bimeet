import { cn } from '@/shared/lib/cn'
import type { HTMLAttributes } from 'react'

export function Kbd({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border border-line-soft bg-surface px-1.5 py-[1px] text-[11px] font-medium text-ink-3',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
