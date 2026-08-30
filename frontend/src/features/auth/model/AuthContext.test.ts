import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { User } from '@/entities/user/model/types'

// Стор импортирует push/badge/api — на уровне теста они побочные, мокаем.
vi.mock('@/shared/push', () => ({ syncPushSubscription: vi.fn() }))
vi.mock('@/shared/badge', () => ({ clearBadge: vi.fn() }))
vi.mock('@/features/auth/api', () => ({ authApi: { verifyCode: vi.fn(), logout: vi.fn().mockResolvedValue(undefined) } }))

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
    vi.clearAllMocks()
  })

  it('гидратирует сессию из сырых ключей localStorage token/user', async () => {
    localStorage.setItem('token', 'jwt-123')
    localStorage.setItem('user', JSON.stringify(USER))

    const useAuthStore = await freshStore()
    const s = useAuthStore.getState()

    expect(s.token).toBe('jwt-123')
    expect(s.user).toEqual(USER)
    expect(s.loading).toBe(false)
  })

  it('без сохранённой сессии стор пустой', async () => {
    const useAuthStore = await freshStore()
    const s = useAuthStore.getState()

    expect(s.token).toBeNull()
    expect(s.user).toBeNull()
  })

  it('logout очищает и стор, и localStorage', async () => {
    localStorage.setItem('token', 'jwt-123')
    localStorage.setItem('user', JSON.stringify(USER))

    const useAuthStore = await freshStore()
    useAuthStore.getState().logout()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    const { authApi } = await import('@/features/auth/api')
    expect(authApi.logout).toHaveBeenCalledOnce()
  })

  it('verifyCode сохраняет token/user в стор и в localStorage', async () => {
    const useAuthStore = await freshStore()
    const { authApi } = await import('@/features/auth/api')
    vi.mocked(authApi.verifyCode).mockResolvedValue({ token: 'jwt-new', user: USER, has_passkeys: false })

    const response = await useAuthStore.getState().verifyCode('a@b.c', '0000')

    expect(response?.has_passkeys).toBe(false)
    expect(useAuthStore.getState().token).toBe('jwt-new')
    expect(useAuthStore.getState().user).toEqual(USER)
    expect(localStorage.getItem('token')).toBe('jwt-new')
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(USER)
  })

  it('verifyCode при ошибке API возвращает null и не трогает сессию', async () => {
    const useAuthStore = await freshStore()
    const { authApi } = await import('@/features/auth/api')
    vi.mocked(authApi.verifyCode).mockRejectedValue(new Error('bad code'))

    const response = await useAuthStore.getState().verifyCode('a@b.c', 'wrong')

    expect(response).toBeNull()
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

  it('событие auth:refreshed синхронизирует новый access-токен', async () => {
    localStorage.setItem('token', 'jwt-old')
    localStorage.setItem('user', JSON.stringify(USER))

    const useAuthStore = await freshStore()
    window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { token: 'jwt-new' } }))

    expect(useAuthStore.getState().token).toBe('jwt-new')
    expect(localStorage.getItem('token')).toBe('jwt-new')
    expect(useAuthStore.getState().user).toEqual(USER)
  })
})
