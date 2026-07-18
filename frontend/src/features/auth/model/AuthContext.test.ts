import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { User } from '@/entities/user/model/types'

// Стор импортирует push/badge/api — на уровне теста они побочные, мокаем.
vi.mock('@/shared/push', () => ({ syncPushSubscription: vi.fn() }))
vi.mock('@/shared/badge', () => ({ clearBadge: vi.fn() }))
vi.mock('@/features/auth/api', () => ({ authApi: { verifyCode: vi.fn() } }))

const USER: User = { id: 'u1', name: 'Test', email: 'a@b.c' }

// Стор гидратируется из localStorage один раз при импорте модуля. Чтобы
// проверять разные начальные состояния, каждый тест берёт свежий модуль.
async function freshStore() {
  vi.resetModules()
  const mod = await import('./AuthContext')
  return mod.useAuthStore
}

describe('auth store (Zustand + persist)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('гидратирует сессию из сырых ключей localStorage token/user', async () => {
    localStorage.setItem('token', 'jwt-123')
    localStorage.setItem('user', JSON.stringify(USER))

    const useAuthStore = await freshStore()
    const s = useAuthStore.getState()

    expect(s.token).toBe('jwt-123')
    expect(s.user).toEqual(USER)
    expect(s.rememberMe).toBe(true)
    expect(s.loading).toBe(false)
  })

  it('без сохранённой сессии стор пустой', async () => {
    const useAuthStore = await freshStore()
    const s = useAuthStore.getState()

    expect(s.token).toBeNull()
    expect(s.user).toBeNull()
  })

  it('logout очищает стор и оба storage', async () => {
    localStorage.setItem('token', 'jwt-123')
    localStorage.setItem('user', JSON.stringify(USER))
    sessionStorage.setItem('token', 'jwt-session')
    sessionStorage.setItem('user', JSON.stringify(USER))

    const useAuthStore = await freshStore()
    useAuthStore.getState().logout()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('user')).toBeNull()
  })

  it('verifyCode без rememberMe сохраняет token/user в sessionStorage', async () => {
    const useAuthStore = await freshStore()
    const { authApi } = await import('@/features/auth/api')
    vi.mocked(authApi.verifyCode).mockResolvedValue({ token: 'jwt-new', user: USER })

    const ok = await useAuthStore.getState().verifyCode('a@b.c', '0000', false)

    expect(ok).toBe(true)
    expect(useAuthStore.getState().token).toBe('jwt-new')
    expect(useAuthStore.getState().user).toEqual(USER)
    expect(useAuthStore.getState().rememberMe).toBe(false)
    expect(sessionStorage.getItem('token')).toBe('jwt-new')
    expect(JSON.parse(sessionStorage.getItem('user')!)).toEqual(USER)
    expect(localStorage.getItem('token')).toBeNull()
    expect(authApi.verifyCode).toHaveBeenCalledWith('a@b.c', '0000', false)
  })

  it('verifyCode с rememberMe сохраняет token/user в localStorage', async () => {
    const useAuthStore = await freshStore()
    const { authApi } = await import('@/features/auth/api')
    vi.mocked(authApi.verifyCode).mockResolvedValue({ token: 'jwt-new', user: USER })

    const ok = await useAuthStore.getState().verifyCode('a@b.c', '0000', true)

    expect(ok).toBe(true)
    expect(useAuthStore.getState().rememberMe).toBe(true)
    expect(localStorage.getItem('token')).toBe('jwt-new')
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(USER)
    expect(sessionStorage.getItem('token')).toBeNull()
  })

  it('verifyCode при ошибке API возвращает false и не трогает сессию', async () => {
    const useAuthStore = await freshStore()
    const { authApi } = await import('@/features/auth/api')
    vi.mocked(authApi.verifyCode).mockRejectedValue(new Error('bad code'))

    const ok = await useAuthStore.getState().verifyCode('a@b.c', 'wrong', false)

    expect(ok).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('событие auth:unauthorized (истёкшая сессия) обнуляет стор', async () => {
    localStorage.setItem('token', 'jwt-123')
    localStorage.setItem('user', JSON.stringify(USER))

    const useAuthStore = await freshStore()
    expect(useAuthStore.getState().user).toEqual(USER)

    window.dispatchEvent(new Event('auth:unauthorized'))

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
  })
})
