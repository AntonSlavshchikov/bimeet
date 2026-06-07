import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-10 px-3 rounded-[var(--radius-control)] bg-surface',
        'border border-line text-[14px] text-ink placeholder:text-ink-3',
        'focus-ring transition',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
