import { cn } from '@/shared/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-5 h-5 rounded-full border-2 border-ink-4 border-t-accent animate-spin',
        className,
      )}
      aria-label="Загрузка"
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="w-7 h-7" />
    </div>
  )
}
