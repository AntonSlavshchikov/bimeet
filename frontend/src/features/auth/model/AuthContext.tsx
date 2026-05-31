import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '@/entities/user/model/types'
import { authApi } from '@/features/auth/api'
import { disablePush } from '@/shared/push'
import { clearBadge } from '@/shared/badge'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  /** Verifies a one-time login code; on success stores token+user and returns true. */
  verifyCode: (email: string, code: string) => Promise<boolean>
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  // Сессия истекла (401 от бэка) → обнуляем стейт. ProtectedRoute сам редиректит на /login.
  useEffect(() => {
    function onUnauthorized() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
      clearBadge()
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [])

  async function verifyCode(email: string, code: string): Promise<boolean> {
    try {
      const res = await authApi.verifyCode(email, code)
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      setToken(res.token)
      setUser(res.user)
      return true
    } catch {
      return false
    }
  }

  function logout() {
    // Отписываем устройство от пушей, чтобы чужие уведомления не приходили на
    // общем девайсе. Локальный unsubscribe инвалидирует endpoint; даже если
    // серверный DELETE не успеет (токен уже снят), бэк удалит мёртвую подписку
    // по 410 при следующей отправке.
    void disablePush().catch(() => {})
    clearBadge()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  function updateUser(updated: User) {
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, verifyCode, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
