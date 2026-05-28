import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

const pillStyles = cva(
  'inline-flex items-center justify-center gap-1 font-semibold rounded-full tracking-[0.01em] whitespace-nowrap transition',
  {
    variants: {
      variant: {
        action:    'bg-accent text-white hover:opacity-92',
        invited:   'bg-warning text-white hover:opacity-92',
        going:     'bg-transparent text-success border border-[color-mix(in_srgb,var(--color-success)_35%,transparent)]',
        host:      'bg-transparent text-ink-3 border border-line font-medium',
        completed: 'bg-transparent text-ink-3 border border-line font-medium',
        neutral:   'bg-line-soft text-ink-2 font-medium',
      },
      size: {
        sm: 'px-2 py-[2px] text-[10px]',
        md: 'px-2.5 py-1 text-[11px]',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'md' },
  }
)

interface StatusPillProps extends VariantProps<typeof pillStyles> {
  className?: string
  children: React.ReactNode
}

/** Кликабельный action-pill (рендерится как button) */
export const StatusPillButton = forwardRef<
  HTMLButtonElement,
  StatusPillProps & ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, variant, size, type = 'button', children, ...props }, ref) => (
  <button ref={ref} type={type} className={cn(pillStyles({ variant, size }), 'focus-ring cursor-pointer', className)} {...props}>
    {children}
  </button>
))
StatusPillButton.displayName = 'StatusPillButton'

/** Не-кликабельный status indicator (рендерится как span) */
export function StatusPill({
  className,
  variant,
  size,
  children,
  ...props
}: StatusPillProps & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn(pillStyles({ variant, size }), className)} {...props}>
      {variant === 'going' && <span aria-hidden>✓</span>}
      {children}
    </span>
  )
}
