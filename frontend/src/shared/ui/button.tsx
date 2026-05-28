import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/shared/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.005em] transition focus-ring disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:opacity-92',
        ghost:   'bg-transparent text-ink-2 hover:bg-hover hover:text-ink',
        outline: 'bg-transparent text-ink-2 border border-line hover:bg-hover hover:text-ink',
        icon:    'bg-transparent text-ink-2 border border-line hover:bg-hover hover:text-ink',
        danger:  'bg-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-[12.5px] rounded-[7px]',
        md: 'h-9 px-3.5 text-[13.5px] rounded-[9px]',
        lg: 'h-11 px-5 text-[15px] rounded-[10px]',
        icon: 'h-9 w-9 rounded-[9px] p-0',
        iconSm: 'h-7 w-7 rounded-[6px] p-0',
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
