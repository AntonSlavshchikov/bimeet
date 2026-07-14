import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[88px] w-full rounded-[var(--radius-control)] bg-surface px-3 py-2.5 text-[13.5px] text-ink placeholder:text-ink-3 resize-y leading-[1.5]',
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
Textarea.displayName = 'Textarea'
