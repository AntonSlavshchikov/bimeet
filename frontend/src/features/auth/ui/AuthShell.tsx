import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Toaster } from '@/shared/ui/toast'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { BrandMark } from '@/shared/ui/brand-mark'

interface AuthShellProps {
  title: string
  subtitle?: string
  /** Сообщение под формой: «Нет аккаунта? Регистрация», «Уже есть? Войти» */
  footer?: ReactNode
  children: ReactNode
}

/**
 * Общий wrapper для login/register/forgot/reset:
 * центрированная карточка max-w-[400px], brand-mark сверху, минимум декора.
 */
export default function AuthShell({ title, subtitle, footer, children }: AuthShellProps) {
  const { t } = useTranslation()
  return (
    <TooltipProvider>
      <div className="min-h-screen warm-canvas-bg flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] flex flex-col gap-6">
          {/* Brand */}
          <Link to="/login" className="flex items-center gap-2 self-center">
            <BrandMark size={54} />
            <div className="text-[17px] font-semibold tracking-[-0.015em] text-ink">bimeet</div>
          </Link>

          {/* Card */}
          <div className="rounded-[var(--radius-card)] border border-line bg-surface/[0.92] p-6 flex flex-col gap-5 warm-surface-shadow backdrop-blur-sm">
            <div>
              <h1 className="text-[22px] font-bold tracking-[-0.02em] leading-[1.2] text-ink">{title}</h1>
              {subtitle && (
                <p className="mt-1 text-[13.5px] text-ink-3">{subtitle}</p>
              )}
            </div>
            {children}
          </div>

          {/* Footer (alt CTA) */}
          {footer && (
            <div className="text-center text-[13px] text-ink-3">{footer}</div>
          )}

          {/* Tagline */}
          <div className="text-center text-[11px] text-ink-4 tracking-[0.04em]">
            {t('auth.tagline', 'Bimeet · события без хаоса')}
          </div>
        </div>
        <Toaster />
      </div>
    </TooltipProvider>
  )
}

interface AuthFieldProps {
  label: string
  children: ReactNode
  error?: string
}

/** Лейбл + контрол + сообщение об ошибке */
export function AuthField({ label, children, error }: AuthFieldProps) {
  return (
    <div>
      <label className="block text-[12px] font-semibold tracking-[-0.005em] text-ink-2 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <div className="mt-1 text-[12px] text-danger font-medium">{error}</div>
      )}
    </div>
  )
}
