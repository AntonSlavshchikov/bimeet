import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@/entities/user/types'
import type { Company } from '@/entities/company/types'
import { authApi, type AuthResponse } from './api'
import { applyBrandColor } from '@/features/branding/applyBrand'

interface AuthContextValue {
  user: User | null
  company: Company | null
  token: string | null
  loading: boolean
  setSession: (res: AuthResponse) => void
  /** Reflect a company change (e.g. owner edited branding) across the app. */
  updateCompany: (company: Company) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  // Initialise synchronously from storage so the effect body stays side-effect
  // free (only async callbacks call setState).
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState<boolean>(() => Boolean(localStorage.getItem('token')))

  // If a session token exists, refresh user+company from /me so a changed brand
  // color is reflected on reload.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    authApi
      .me()
      .then(({ user, company }) => {
        if (cancelled) return
        setUser(user)
        setCompany(company)
        applyBrandColor(company.brand_color)
      })
      .catch(() => {
        if (cancelled) return
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // Run once on mount; token changes from login/logout drive their own state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A 401 anywhere clears the session.
  useEffect(() => {
    function onUnauthorized() {
      setToken(null)
      setUser(null)
      setCompany(null)
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [])

  function setSession(res: AuthResponse) {
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    setToken(res.token)
    setUser(res.user)
    setCompany(res.company)
    applyBrandColor(res.company.brand_color)
  }

  function updateCompany(c: Company) {
    setCompany(c)
    applyBrandColor(c.brand_color)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setCompany(null)
  }

  return (
    <AuthContext.Provider value={{ user, company, token, loading, setSession, updateCompany, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
