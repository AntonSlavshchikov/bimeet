import type { ReactNode } from 'react'

interface AuthShellProps {
  brandName?: string
  logoUrl?: string | null
  title: string
  subtitle?: string
  children?: ReactNode
  footer?: ReactNode
}

// AuthShell is the centered card used by login / registration / accept-invite.
// The header shows the company brand (logo or name) so an employee sees their
// company, not Bimeet.
export function AuthShell({ brandName, logoUrl, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-6">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName ?? 'logo'} className="h-12 mb-3 object-contain" />
          ) : (
            <div className="h-11 w-11 mb-3 rounded-[12px] bg-accent text-white flex items-center justify-center text-[18px] font-bold">
              {(brandName ?? 'B').slice(0, 1).toUpperCase()}
            </div>
          )}
          {brandName && <div className="text-[15px] font-semibold text-ink">{brandName}</div>}
        </div>

        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-[20px] font-bold tracking-[-0.01em] text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[13.5px] text-ink-3">{subtitle}</p>}
          {children && <div className="mt-5">{children}</div>}
        </div>

        {footer && <div className="mt-4 text-center text-[13px] text-ink-3">{footer}</div>}
      </div>
    </div>
  )
}
