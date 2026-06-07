import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-3 py-2 rounded-[var(--radius-control)] bg-surface',
        'border border-line text-[14px] text-ink placeholder:text-ink-3',
        'focus-ring transition resize-y',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
