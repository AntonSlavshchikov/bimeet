import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { User } from '@/entities/user/model/types'
import { authApi, type AuthResponse } from '@/features/auth/api'
import { syncPushSubscription } from '@/shared/push'
import { clearBadge } from '@/shared/badge'

// Состояние аутентификации. Раньше жило в React Context (AuthProvider), теперь —
// Zustand store с persist. Хук useAuth() сохранил прежнюю сигнатуру, поэтому
// потребители не меняются. Провайдер больше не нужен (Zustand без провайдера).

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  /** Persists any successful auth response and synchronizes device state. */
  completeAuth: (response: AuthResponse) => void
  /** Verifies a one-time login code; returns the response on success. */
  verifyCode: (email: string, code: string) => Promise<AuthResponse | null>
  logout: () => void
  clearLocalSession: () => void
  updateUser: (user: User) => void
}

// Совместимость: apiFetch (shared/api/client.ts) читает токен из сырого ключа
// localStorage 'token', а старые сессии лежат в 'token' (строка) + 'user' (JSON).
// Кастомное storage мапит persist на эти же ключи — запросы продолжают видеть
// токен, а пользователи не разлогиниваются при деплое.
const authStorage: StateStorage = {
  getItem: () => {
    const token = localStorage.getItem('token')
    const userRaw = localStorage.getItem('user')
    if (!token || !userRaw) return null
    try {
      return JSON.stringify({ state: { token, user: JSON.parse(userRaw) }, version: 0 })
    } catch {
      return null
    }
  },
  setItem: (_name, value) => {
    const { state } = JSON.parse(value) as { state: { token: string | null; user: User | null } }
    if (state.token) localStorage.setItem('token', state.token)
    else localStorage.removeItem('token')
    if (state.user) localStorage.setItem('user', JSON.stringify(state.user))
    else localStorage.removeItem('user')
  },
  removeItem: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      // Хранилище синхронное (localStorage), persist гидратирует token/user уже
      // при создании стора — отдельная фаза загрузки не нужна.
      loading: false,
      completeAuth(response) {
        set({ token: response.token, user: response.user })
        // Одинаковый post-login путь для email-кода и passkey.
        void syncPushSubscription()
      },
      async verifyCode(email, code) {
        try {
          const res = await authApi.verifyCode(email, code)
          get().completeAuth(res)
          return res
        } catch {
          return null
        }
      },
      logout() {
        // Подписку на пуши НЕ трогаем: при следующем входе она тихо
        // перепривязывается к актуальному пользователю (syncPushSubscription).
        clearBadge()
        void authApi.logout().catch(() => undefined)
        set({ token: null, user: null })
      },
      clearLocalSession() {
        clearBadge()
        set({ token: null, user: null })
      },
      updateUser(user) {
        set({ user })
      },
    }),
    {
      // Имя для persist; фактические данные кастомное storage кладёт в 'token'/'user'.
      name: 'auth',
      storage: createJSONStorage(() => authStorage),
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
)

// Refresh не удался: client.ts очищает localStorage и шлёт событие — обнуляем
// стор. ProtectedRoute сам редиректит на /login.
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    clearBadge()
    useAuthStore.setState({ token: null, user: null })
  })
  window.addEventListener('auth:refreshed', (event) => {
    const token = (event as CustomEvent<{ token?: string }>).detail?.token
    if (token) useAuthStore.setState({ token })
  })
}

/**
 * Прежний Context-совместимый хук: тот же набор полей.
 * Новый код может селектить точечно: useAuthStore(s => s.user).
 */
export function useAuth(): AuthState {
  return useAuthStore()
}
