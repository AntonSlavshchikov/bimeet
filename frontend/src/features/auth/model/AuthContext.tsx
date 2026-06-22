import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { User } from '@/entities/user/model/types'
import { authApi } from '@/features/auth/api'
import { syncPushSubscription } from '@/shared/push'
import { clearBadge } from '@/shared/badge'

// Состояние аутентификации. Раньше жило в React Context (AuthProvider), теперь —
// Zustand store с persist. Хук useAuth() сохранил прежнюю сигнатуру, поэтому
// потребители не меняются. Провайдер больше не нужен (Zustand без провайдера).

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  /** Verifies a one-time login code; on success stores token+user and returns true. */
  verifyCode: (email: string, code: string) => Promise<boolean>
  logout: () => void
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
    (set) => ({
      user: null,
      token: null,
      // Хранилище синхронное (localStorage), persist гидратирует token/user уже
      // при создании стора — отдельная фаза загрузки не нужна.
      loading: false,
      async verifyCode(email, code) {
        try {
          const res = await authApi.verifyCode(email, code)
          set({ token: res.token, user: res.user })
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

// Сессия истекла: client.ts на 401 уже очистил localStorage и шлёт событие —
// обнуляем стор. ProtectedRoute сам редиректит на /login.
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    clearBadge()
    useAuthStore.setState({ token: null, user: null })
  })
}

/**
 * Прежний Context-совместимый хук: тот же набор полей.
 * Новый код может селектить точечно: useAuthStore(s => s.user).
 */
export function useAuth(): AuthState {
  return useAuthStore()
}
