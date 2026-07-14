import { cn } from '@/shared/lib/cn'

interface BrandMarkProps {
  /** Ширина фирменного знака в px; пропорции берутся из landing-asset. */
  size?: number
  className?: string
}

/** Цветной знак Bimeet, общий для landing и приложения. */
export function BrandMark({ size = 40, className }: BrandMarkProps) {
  return (
    <img
      src="/logo-mark.svg"
      width={size}
      height={Math.round(size * 534 / 914)}
      className={cn('block h-auto shrink-0', className)}
      alt=""
      aria-hidden="true"
    />
  )
}
