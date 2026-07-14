import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-9 w-full rounded-[var(--radius-control)] bg-surface px-3 text-[13.5px] text-ink placeholder:text-ink-3',
        'border border-line shadow-[0_1px_2px_rgba(18,18,20,0.035)] transition outline-none',
        'hover:border-[color-mix(in_srgb,var(--color-ink)_18%,transparent)]',
        'focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_16%,transparent),0_1px_2px_rgba(18,18,20,0.04)]',
        'disabled:bg-bg-2 disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
