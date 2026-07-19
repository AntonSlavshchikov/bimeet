import { forwardRef, Children, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/** Градиент фона аватара, выбирается по хэшу строки — стабилен для пользователя, разный между пользователями */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
  'linear-gradient(135deg, var(--color-purple), var(--color-avatar-4))',
  'linear-gradient(135deg, var(--color-indigo), var(--color-accent))',
  'linear-gradient(135deg, var(--color-avatar-2), var(--color-indigo))',
  'linear-gradient(135deg, var(--color-avatar-5), var(--color-avatar-2))',
  'linear-gradient(135deg, var(--color-avatar-1), var(--color-avatar-4))',
]

function avatarGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length]
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
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full text-white font-bold border-surface bg-cover bg-center',
          sizeMap[size],
          className,
        )}
        style={src ? { backgroundImage: `url(${src})`, ...style } : { background: avatarGradient(name), ...style }}
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
