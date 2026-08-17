import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number; className?: string }>
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-line bg-surface px-5 py-14 text-center', className)}>
      {Icon && (
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-2 text-ink-3">
          <Icon size={20} />
        </div>
      )}
      <div className="text-[14px] font-semibold text-ink">{title}</div>
      {description && <div className="mt-1 max-w-md text-[12.5px] leading-[1.5] text-ink-3">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
