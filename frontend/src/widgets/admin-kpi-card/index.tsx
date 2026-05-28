import type { ElementType, ReactNode } from 'react'

interface AdminKpiCardProps {
  label: string
  value: ReactNode
  icon?: ElementType
  hint?: string
}

export default function AdminKpiCard({ label, value, icon: Icon, hint }: AdminKpiCardProps) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="text-[11px] font-semibold text-ink-3 uppercase tracking-[0.04em]">{label}</div>
          <div className="text-[26px] font-bold leading-[1.1] tracking-[-0.02em] text-ink tnum">{value}</div>
          {hint && <div className="text-[11.5px] text-ink-3 mt-0.5">{hint}</div>}
        </div>
        {Icon && (
          <div className="flex items-center justify-center w-9 h-9 rounded-[8px] bg-bg-2 text-accent shrink-0">
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  )
}
