import { cloneElement, forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactElement } from 'react'
import { cn } from '@/shared/lib/cn'

type Variant = 'primary' | 'ghost' | 'outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  /** Render the single child element (e.g. a <Link>) with button styles. */
  asChild?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:opacity-90 disabled:opacity-50',
  ghost: 'bg-transparent text-ink-2 hover:bg-hover disabled:opacity-50',
  outline: 'border border-line bg-surface text-ink hover:bg-hover disabled:opacity-50',
}

const base =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-control)] ' +
  'text-[14px] font-semibold transition focus-ring disabled:cursor-not-allowed'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, disabled, asChild, children, ...props }, ref) => {
    const classes = cn(base, variants[variant], className)

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string }>
      return cloneElement(child, { className: cn(classes, child.props.className) })
    }

    return (
      <button ref={ref} disabled={disabled || loading} className={classes} {...props}>
        {loading && (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
