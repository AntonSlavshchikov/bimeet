import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { User } from '@/entities/user/model/types'
import { authApi } from '@/features/auth/api'
import { syncPushSubscription } from '@/shared/push'
import { clearBadge } from '@/shared/badge'
import { clearSession, readSession, writeSession } from '@/shared/auth/session'

// Состояние аутентификации. Раньше жило в React Context (AuthProvider), теперь —
// Zustand store с persist. Хук useAuth() сохранил прежнюю сигнатуру, поэтому
// потребители не меняются. Провайдер больше не нужен (Zustand без провайдера).

interface AuthState {
  user: User | null
  token: string | null
  rememberMe: boolean
  loading: boolean
  /** Verifies a one-time login code; on success stores token+user and returns true. */
  verifyCode: (email: string, code: string, rememberMe: boolean) => Promise<boolean>
  logout: () => void
  updateUser: (user: User) => void
}

const authStorage: StateStorage = {
  getItem: () => {
    const session = readSession<User>()
    if (!session) return null
    return JSON.stringify({ state: session, version: 0 })
  },
  setItem: (_name, value) => {
    const { state } = JSON.parse(value) as {
      state: { token: string | null; user: User | null; rememberMe: boolean }
    }
    if (state.token && state.user) writeSession(state.token, state.user, state.rememberMe)
    else clearSession()
  },
  removeItem: clearSession,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      rememberMe: false,
      // Web Storage синхронный, persist гидратирует token/user уже
      // при создании стора — отдельная фаза загрузки не нужна.
      loading: false,
      async verifyCode(email, code, rememberMe) {
        try {
          const res = await authApi.verifyCode(email, code, rememberMe)
          set({ token: res.token, user: res.user, rememberMe })
          // Если устройство уже было подписано на пуши — тихо перепривязываем
          // подписку к этому аккаунту (без повторного запроса разрешения).
          void syncPushSubscription()
          return true
        } catch {
          return false
        }
      },
      logout() {
        // Подписку на пуши НЕ трогаем: при следующем входе она тихо
        // перепривязывается к актуальному пользователю (syncPushSubscription).
        clearBadge()
        set({ token: null, user: null, rememberMe: false })
      },
      updateUser(user) {
        set({ user })
      },
    }),
    {
      // Имя для persist; фактические данные кастомное storage кладёт в 'token'/'user'.
      name: 'auth',
      storage: createJSONStorage(() => authStorage),
      partialize: (s) => ({ token: s.token, user: s.user, rememberMe: s.rememberMe }),
    },
  ),
)

// Сессия истекла: client.ts на 401 уже очистил оба storage и шлёт событие —
// обнуляем стор. ProtectedRoute сам редиректит на /login.
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    clearBadge()
    useAuthStore.setState({ token: null, user: null, rememberMe: false })
  })
}

/**
 * Прежний Context-совместимый хук: тот же набор полей.
 * Новый код может селектить точечно: useAuthStore(s => s.user).
 */
export function useAuth(): AuthState {
  return useAuthStore()
}
