import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  eyebrow?: ReactNode
  filters?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, eyebrow, filters, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 min-[761px]:flex-row min-[761px]:items-end min-[761px]:justify-between min-[761px]:gap-5', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-3">
            {eyebrow}
          </div>
        )}
        <h1 className="app-page-title text-[28px] font-bold leading-[1.05] tracking-[-0.035em] text-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-[7px] text-[11.5px] leading-[1.45] text-ink-3">{subtitle}</p>}
      </div>
      {(filters || actions) && (
        <div className="flex min-w-0 flex-col gap-2 min-[761px]:flex-row min-[761px]:items-center">
          {filters}
          {actions}
        </div>
      )}
    </header>
  )
}
