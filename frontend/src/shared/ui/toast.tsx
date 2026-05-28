import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from 'sonner'

/** Sonner toaster — монтируется один раз в Layout */
export function Toaster() {
  return (
    <Sonner
      position="top-right"
      duration={3500}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-[12px] border border-line bg-surface text-ink text-[13.5px] shadow-[0_8px_32px_rgba(0,0,0,0.10)] px-3.5 py-3',
          title: 'text-ink font-semibold text-[13.5px]',
          description: 'text-ink-3 text-[12.5px] mt-0.5',
          actionButton: 'bg-accent text-white rounded-[7px] px-2.5 py-1 text-[12px] font-semibold',
          cancelButton: 'bg-bg-2 text-ink-2 rounded-[7px] px-2.5 py-1 text-[12px] font-medium',
          closeButton: 'bg-bg-2 border border-line text-ink-3 hover:text-ink',
          error: 'border-danger/30',
          success: 'border-success/30',
          warning: 'border-warning/30',
        },
      }}
    />
  )
}

/**
 * `useToast()` — Chakra-compatible API для облегчения миграции.
 * Сигнатура: `toast({ title, description, status, duration })`.
 * Возвращает sonner-функцию для расширенного использования.
 */
type ChakraStatus = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface ChakraToastInput {
  title?: string
  description?: string
  status?: ChakraStatus
  duration?: number
  isClosable?: boolean
}

export function useToast() {
  return Object.assign(
    function toast(input: ChakraToastInput | string) {
      const opts: ChakraToastInput = typeof input === 'string' ? { title: input } : input
      const data: ExternalToast = {
        description: opts.description,
        duration: opts.duration,
      }
      const title = opts.title ?? ''
      switch (opts.status) {
        case 'success': return sonnerToast.success(title, data)
        case 'error':   return sonnerToast.error(title, data)
        case 'warning': return sonnerToast.warning(title, data)
        case 'loading': return sonnerToast.loading(title, data)
        default:        return sonnerToast(title, data)
      }
    },
    sonnerToast,
  )
}

export const toast = sonnerToast
