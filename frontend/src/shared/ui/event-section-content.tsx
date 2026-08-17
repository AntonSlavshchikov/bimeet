import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface EventSectionHeaderProps {
  kicker: string
  title: string
  description: string
  action?: ReactNode
}

export function EventSectionHeader({ kicker, title, description, action }: EventSectionHeaderProps) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-4 min-[761px]:flex-row min-[761px]:items-start min-[761px]:gap-5">
      <div className="min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-3">{kicker}</div>
        <h2 className="mt-[5px] text-[22px] font-bold tracking-[-0.035em] text-ink">{title}</h2>
        <p className="mt-[7px] max-w-[680px] text-[12px] leading-[1.55] text-ink-2">{description}</p>
      </div>
      {action && <div className="grid shrink-0 grid-cols-1 gap-2 min-[761px]:flex min-[761px]:flex-wrap min-[761px]:justify-end">{action}</div>}
    </div>
  )
}

export function EventSectionStats({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mt-[22px] grid grid-cols-1 gap-2.5 min-[761px]:grid-cols-3', className)}>
      {children}
    </div>
  )
}

interface EventSectionStatProps {
  label: string
  value: ReactNode
  note?: ReactNode
}

export function EventSectionStat({ label, value, note }: EventSectionStatProps) {
  return (
    <div className="rounded-[15px] border border-line bg-bg-2/55 p-[15px]">
      <div className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-3">{label}</div>
      <div className="mt-1.5 text-[16px] font-bold tracking-[-0.02em] text-ink tnum">{value}</div>
      {note && <div className="mt-1 text-[10px] text-ink-3">{note}</div>}
    </div>
  )
}

export function EventSectionProgress({ value, label }: { value: number; label?: ReactNode }) {
  return (
    <div className="mt-4">
      <div className="h-[7px] overflow-hidden rounded-full bg-line-soft">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-a),var(--color-brand-b),var(--color-brand-c))] transition-[width]"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {label && <div className="mt-2 text-[10px] text-ink-3">{label}</div>}
    </div>
  )
}

export function EventSectionList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-[19px] border-t border-line', className)}>{children}</div>
}

export function EventSectionRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('border-b border-line py-[13px]', className)}>
      {children}
    </div>
  )
}

interface EventSectionDataRowProps {
  avatar: ReactNode
  name: ReactNode
  note: ReactNode
  status: ReactNode
  statusTone?: 'success' | 'warning' | 'danger' | 'neutral'
  details?: ReactNode
  className?: string
  onClick?: () => void
  expanded?: boolean
  ariaLabel?: string
}

export function EventSectionDataRow({
  avatar,
  name,
  note,
  status,
  statusTone = 'success',
  details,
  className,
  onClick,
  expanded,
  ariaLabel,
}: EventSectionDataRowProps) {
  const rowContent = (
    <>
      <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-purple)_11%,var(--color-bg-2))] text-[10px] font-bold text-purple min-[761px]:h-9 min-[761px]:w-9">
        {avatar}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-bold text-ink">{name}</div>
        <div className="mt-[3px] truncate text-[9px] text-ink-3">{note}</div>
      </div>
      <div
        className={cn(
          'col-start-2 justify-self-start text-[10px] font-bold whitespace-nowrap min-[761px]:col-start-auto min-[761px]:justify-self-end',
          statusTone === 'success' && 'text-success',
          statusTone === 'warning' && 'text-warning',
          statusTone === 'danger' && 'text-danger',
          statusTone === 'neutral' && 'text-ink-3',
        )}
      >
        {status}
      </div>
    </>
  )

  return (
    <EventSectionRow className={cn('px-[2px]', onClick && 'py-0', className)}>
      {onClick ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={ariaLabel}
          onClick={onClick}
          className="focus-ring grid w-full grid-cols-[34px_minmax(0,1fr)] items-center gap-[11px] rounded-[11px] py-[13px] text-left transition hover:bg-hover min-[761px]:grid-cols-[36px_minmax(0,1fr)_auto]"
        >
          {rowContent}
        </button>
      ) : (
        <div className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-[11px] min-[761px]:grid-cols-[36px_minmax(0,1fr)_auto]">
          {rowContent}
        </div>
      )}
      {details && <div className={cn('ml-[47px] mt-3', onClick && 'mb-[13px] mt-0')}>{details}</div>}
    </EventSectionRow>
  )
}

interface EventSectionEmptyProps {
  icon: ComponentType<{ size?: number; className?: string }>
  children: ReactNode
}

export function EventSectionEmpty({ icon: Icon, children }: EventSectionEmptyProps) {
  return (
    <div className="mt-[22px] flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[16px] border border-line bg-bg-2/35 px-4 py-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-bg-2 text-ink-3">
        <Icon size={20} />
      </span>
      <p className="text-[13px] text-ink-3">{children}</p>
    </div>
  )
}
