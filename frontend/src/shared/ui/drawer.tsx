import { Drawer as Vaul } from 'vaul'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export const Drawer = Vaul.Root
export const DrawerTrigger = Vaul.Trigger
export const DrawerClose = Vaul.Close
export const DrawerPortal = Vaul.Portal

export const DrawerOverlay = forwardRef<
  ElementRef<typeof Vaul.Overlay>,
  ComponentPropsWithoutRef<typeof Vaul.Overlay>
>(({ className, ...props }, ref) => (
  <Vaul.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/40', className)}
    {...props}
  />
))
DrawerOverlay.displayName = 'DrawerOverlay'

interface DrawerContentProps extends ComponentPropsWithoutRef<typeof Vaul.Content> {
  side?: 'bottom' | 'left' | 'right'
}

export const DrawerContent = forwardRef<ElementRef<typeof Vaul.Content>, DrawerContentProps>(
  ({ className, children, side = 'bottom', ...props }, ref) => {
    const positioning = {
      bottom: 'bottom-0 left-0 right-0 mt-24 rounded-t-[14px]',
      left:   'left-0 top-0 bottom-0 w-[260px] rounded-r-[14px]',
      right:  'right-0 top-0 bottom-0 w-[340px] rounded-l-[14px]',
    }[side]
    return (
      <DrawerPortal>
        <DrawerOverlay />
        <Vaul.Content
          ref={ref}
          className={cn(
            'fixed z-50 flex h-auto flex-col bg-surface',
            positioning,
            className,
          )}
          {...props}
        >
          {side === 'bottom' && (
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-line" aria-hidden />
          )}
          {children}
        </Vaul.Content>
      </DrawerPortal>
    )
  }
)
DrawerContent.displayName = 'DrawerContent'

export function DrawerHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />
}

export function DrawerFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-auto flex items-center justify-end gap-2 p-5 pt-3 border-t border-line', className)} {...props} />
}

export const DrawerTitle = forwardRef<
  ElementRef<typeof Vaul.Title>,
  ComponentPropsWithoutRef<typeof Vaul.Title>
>(({ className, ...props }, ref) => (
  <Vaul.Title
    ref={ref}
    className={cn('text-[17px] font-semibold tracking-[-0.015em] text-ink', className)}
    {...props}
  />
))
DrawerTitle.displayName = 'DrawerTitle'

export const DrawerDescription = forwardRef<
  ElementRef<typeof Vaul.Description>,
  ComponentPropsWithoutRef<typeof Vaul.Description>
>(({ className, ...props }, ref) => (
  <Vaul.Description
    ref={ref}
    className={cn('text-[13.5px] text-ink-3', className)}
    {...props}
  />
))
DrawerDescription.displayName = 'DrawerDescription'
