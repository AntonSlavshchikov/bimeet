import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/shared/lib/cn'

interface OtpInputProps {
  /** Current value (the joined digits). */
  value: string
  /** Called with the new joined value whenever it changes. */
  onChange: (value: string) => void
  /** Number of cells. */
  length?: number
  /** Called once the value reaches `length` digits (e.g. to auto-submit). */
  onComplete?: (value: string) => void
  /** Highlight all cells in red (e.g. after a wrong code). */
  error?: boolean
  disabled?: boolean
  autoFocus?: boolean
}

/**
 * Segmented one-time-code input — a row of single-digit cells with the modern
 * UX: typing advances focus, Backspace walks back, full paste fills all cells.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  onComplete,
  error,
  disabled,
  autoFocus,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function emit(next: string) {
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

  function focusCell(i: number) {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))]
    el?.focus()
    el?.select()
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    if (!digit) return
    const chars = value.split('')
    chars[index] = digit
    const next = chars.join('').slice(0, length)
    emit(next)
    focusCell(index + 1)
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const chars = value.split('')
      if (chars[index]) {
        chars[index] = ''
        emit(chars.join(''))
      } else if (index > 0) {
        chars[index - 1] = ''
        emit(chars.join(''))
        focusCell(index - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusCell(index - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusCell(index + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!digits) return
    emit(digits)
    focusCell(digits.length)
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Код подтверждения">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={cn(
            'h-12 w-full min-w-0 rounded-[10px] bg-bg-2 text-center text-[18px] font-semibold text-ink',
            'border border-transparent transition outline-none caret-accent',
            'focus:bg-surface focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_14%,transparent)]',
            value[i] && 'border-line',
            error &&
              'border-danger text-danger focus:border-danger focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-danger)_16%,transparent)]',
            'disabled:opacity-50',
          )}
        />
      ))}
    </div>
  )
}
