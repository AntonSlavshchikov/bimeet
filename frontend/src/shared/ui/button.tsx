import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/shared/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-[7px] font-bold transition-[color,background-color,background-image,box-shadow,filter] focus-ring disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'brand-gradient hover:brightness-[0.98] active:brightness-[0.94]',
        soft:    'bg-bg-2 text-ink hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,var(--color-bg-2))]',
        ghost:   'bg-transparent text-ink-2 hover:bg-hover hover:text-ink',
        outline: 'bg-transparent text-ink-2 border border-line hover:bg-hover hover:text-ink',
        icon:    'bg-transparent text-ink-2 border border-line hover:bg-hover hover:text-ink',
        danger:  'bg-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-[11px] rounded-[10px]',
        md: 'h-9 px-3.5 text-[11.5px] rounded-[var(--radius-control)]',
        lg: 'h-11 px-5 text-[15px] rounded-[14px]',
        icon: 'h-9 w-9 rounded-[var(--radius-control)] p-0',
        iconSm: 'h-7 w-7 rounded-[9px] p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { buttonVariants }
