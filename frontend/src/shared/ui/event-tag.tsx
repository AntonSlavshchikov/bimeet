import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/cn'
import type { HTMLAttributes } from 'react'

const tagStyles = cva(
  'inline-flex items-center gap-1 rounded-[4px] px-[7px] py-[1px] text-[10px] font-semibold uppercase tracking-[0.02em] whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-line-soft text-ink-3',
        public:  'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-accent',
        work:    'bg-line-soft text-ink-2',
        host:    'bg-[color-mix(in_srgb,var(--color-purple)_12%,transparent)] text-purple',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

interface EventTagProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagStyles> {}

export function EventTag({ className, variant, children, ...props }: EventTagProps) {
  return (
    <span className={cn(tagStyles({ variant }), className)} {...props}>
      {children}
    </span>
  )
}
