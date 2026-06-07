import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-[12px] font-semibold text-ink-2 flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
    </div>
  )
}
