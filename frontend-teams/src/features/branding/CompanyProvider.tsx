import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { companyApi } from '@/entities/company/api'
import type { PublicCompany } from '@/entities/company/types'
import { resolveSubdomain } from '@/shared/lib/subdomain'

interface CompanyContextValue {
  /** Current subdomain, or null on the registration host. */
  subdomain: string | null
  /** Public brand info for the subdomain, or null while loading / on the registration host. */
  company: PublicCompany | null
  loading: boolean
  /** True when a subdomain was given but no such company exists. */
  notFound: boolean
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const subdomain = resolveSubdomain()
  const [company, setCompany] = useState<PublicCompany | null>(null)
  const [loading, setLoading] = useState(subdomain !== null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!subdomain) return
    let cancelled = false
    companyApi
      .getPublicBySubdomain(subdomain)
      .then(c => {
        if (cancelled) return
        setCompany(c)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [subdomain])

  return (
    <CompanyContext.Provider value={{ subdomain, company, loading, notFound }}>
      {children}
    </CompanyContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider')
  return ctx
}
