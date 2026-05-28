import { forwardRef, Children, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/** Цвет фона аватара по 6-цветной системной палитре, выбирается по хэшу строки */
function avatarColor(seed: string): string {
  const palette = [
    'bg-[var(--color-avatar-1)]',
    'bg-[var(--color-avatar-2)]',
    'bg-[var(--color-avatar-3)]',
    'bg-[var(--color-avatar-4)]',
    'bg-[var(--color-avatar-5)]',
    'bg-[var(--color-avatar-6)]',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const sizeMap = {
  xs: 'w-5 h-5 text-[8px] border',
  sm: 'w-6 h-6 text-[9px] border-2',
  md: 'w-7 h-7 text-[10px] border-2',
  lg: 'w-9 h-9 text-[12px] border-2',
  xl: 'w-14 h-14 text-[18px] border-2',
} as const

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  src?: string | null
  size?: keyof typeof sizeMap
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, src, size = 'sm', className, style, ...props }, ref) => {
    const initial = initials(name)
    const color = src ? '' : avatarColor(name)
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full text-white font-bold border-surface bg-cover bg-center',
          sizeMap[size],
          color,
          className,
        )}
        style={src ? { backgroundImage: `url(${src})`, ...style } : style}
        aria-label={name}
        {...props}
      >
        {!src && initial}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'

export interface AvatarStackProps extends HTMLAttributes<HTMLDivElement> {
  max?: number
  size?: keyof typeof sizeMap
  children: ReactNode
}

export function AvatarStack({ max, size = 'sm', className, children, ...props }: AvatarStackProps) {
  const all = Children.toArray(children)
  const shown = max ? all.slice(0, max) : all
  const overflow = max && all.length > max ? all.length - max : 0
  return (
    <div className={cn('inline-flex', className)} {...props}>
      {shown.map((child, i) => (
        <div key={i} className="first:ml-0 -ml-1.5">{child}</div>
      ))}
      {overflow > 0 && (
        <div className="-ml-1.5">
          <div
            className={cn(
              'inline-flex items-center justify-center rounded-full font-bold border-surface bg-line-soft text-ink-2',
              sizeMap[size],
            )}
          >
            +{overflow}
          </div>
        </div>
      )}
    </div>
  )
}
