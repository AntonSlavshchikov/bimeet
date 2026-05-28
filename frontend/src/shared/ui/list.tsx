import { forwardRef, type HTMLAttributes, type AnchorHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type AccentColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'indigo' | 'gray'

const accentBg: Record<AccentColor, string> = {
  blue: 'bg-accent',
  green: 'bg-success',
  orange: 'bg-warning',
  red: 'bg-danger',
  purple: 'bg-purple',
  indigo: 'bg-indigo',
  gray: 'bg-ink-4',
}

/** Inset-list контейнер с border + radius. Внутри — ListRow'ы. */
export const ListGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'overflow-hidden rounded-[12px] border border-line bg-surface',
        '[&>*+*]:border-t [&>*+*]:border-line-soft',
        className,
      )}
      {...props}
    />
  )
)
ListGroup.displayName = 'ListGroup'

interface ListRowBaseProps {
  accent?: AccentColor
  className?: string
  /** Если задан — row рендерится как <a>, иначе как <div> */
  href?: string
  onClick?: () => void
  children: React.ReactNode
}

/** Базовый ListRow — горизонтальный flex с accent-bar слева full-row-height */
export function ListRow({
  accent = 'gray',
  className,
  href,
  onClick,
  children,
  ...rest
}: ListRowBaseProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ListRowBaseProps>) {
  const cls = cn(
    'group relative flex items-stretch transition cursor-pointer',
    'hover:bg-hover',
    className,
  )

  const Inner = (
    <>
      <div className={cn('w-1 shrink-0', accentBg[accent])} aria-hidden />
      <div className="flex flex-1 items-center min-w-0">{children}</div>
    </>
  )

  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls} {...rest}>
        {Inner}
      </a>
    )
  }
  return (
    <div onClick={onClick} className={cls}>
      {Inner}
    </div>
  )
}
