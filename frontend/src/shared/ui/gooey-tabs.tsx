import { cn } from '@/shared/lib/cn'
import type { ReactNode } from 'react'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface GooeyTabOption<T extends string> {
  value: T
  label: ReactNode
}

interface GooeyTabsProps<T extends string> {
  value: T
  onChange: (next: T) => void
  options: GooeyTabOption<T>[]
  className?: string
}

export function GooeyTabs<T extends string>({ value, onChange, options, className }: GooeyTabsProps<T>) {
  const filterId = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>())
  const [rect, setRect] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current
      const btn = buttonRefs.current.get(value)
      if (!track || !btn) return
      const trackBox = track.getBoundingClientRect()
      const btnBox = btn.getBoundingClientRect()
      setRect({ left: btnBox.left - trackBox.left, width: btnBox.width })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [value, options])

  return (
    <div
      role="tablist"
      className={cn(
        'relative inline-flex p-[3px] rounded-[9px] bg-bg-2 max-w-full overflow-x-auto whitespace-nowrap',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div ref={trackRef} className="relative flex gap-[2px]">
        {/* Filtered layer: only the selected-tab indicator lives here, so the goo effect never touches text.
            Tracks `value` only (not hover) — the blob always marks the section we're actually on. */}
        {rect && (
          <div className="absolute inset-y-0 left-0 pointer-events-none" style={{ filter: `url(#${filterId})` }}>
            <motion.div
              className="absolute inset-y-0 rounded-[7px] bg-[#3A3A3C]"
              initial={false}
              animate={{ left: rect.left, width: rect.width }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            />
          </div>
        )}

        {/* Unfiltered overlay: interactive buttons + labels, crisp text */}
        {options.map(opt => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              ref={el => {
                if (el) buttonRefs.current.set(opt.value, el)
                else buttonRefs.current.delete(opt.value)
              }}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'relative z-10 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[13px] rounded-[7px] font-medium tracking-[-0.005em] cursor-pointer transition-colors focus-ring',
                active ? 'text-white font-semibold' : 'text-ink-2 hover:text-ink',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
