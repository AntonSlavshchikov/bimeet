import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[88px] w-full rounded-[9px] bg-bg-2 px-3 py-2.5 text-[13.5px] text-ink placeholder:text-ink-3 resize-y leading-[1.5]',
        'border border-transparent transition outline-none',
        'focus:bg-surface focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_14%,transparent)]',
        className,
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
