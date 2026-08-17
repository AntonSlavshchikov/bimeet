import { Search } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { Kbd } from './kbd'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Текст подсказки клавиши справа (без символа ⌘) */
  kbdHint?: string
  className?: string
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, kbdHint, placeholder = 'Найти...', ...props }, ref) => (
    <div className={cn('relative', className)}>
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-[var(--radius-control)] bg-bg-2 pl-9 pr-12 text-[13.5px] text-ink placeholder:text-ink-3',
          'border border-transparent transition outline-none',
          'focus:bg-surface focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_14%,transparent)]',
        )}
        {...props}
      />
      {kbdHint && (
        <Kbd className="absolute right-2 top-1/2 -translate-y-1/2">{kbdHint}</Kbd>
      )}
    </div>
  )
)
SearchInput.displayName = 'SearchInput'
