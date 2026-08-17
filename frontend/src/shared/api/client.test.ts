import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiFetch } from './client'

// apiFetch — единственная точка всех запросов к бэку. Критично: токен в заголовке,
// прозрачная ротация сессии на 401 и проброс ошибок.

interface FetchResult {
  ok?: boolean
  status?: number
  jsonData?: unknown
}

function mockFetch(res: FetchResult) {
  const f = vi.fn().mockResolvedValue({
    ok: res.ok ?? true,
    status: res.status ?? 200,
    json: async () => res.jsonData,
  })
  vi.stubGlobal('fetch', f)
  return f
}

// Заголовки, с которыми реально вызвали fetch.
function sentHeaders(f: ReturnType<typeof mockFetch>): Record<string, string> {
  return (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>
}

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('добавляет Authorization: Bearer при наличии токена', async () => {
    localStorage.setItem('token', 'jwt-1')
    const f = mockFetch({ jsonData: { ok: true } })

    await apiFetch('/api/x')

    expect(sentHeaders(f).Authorization).toBe('Bearer jwt-1')
    expect((f.mock.calls[0][1] as RequestInit).credentials).toBe('include')
  })

  it('без токена не отправляет Authorization', async () => {
    const f = mockFetch({ jsonData: {} })

    await apiFetch('/api/x')

    expect(sentHeaders(f).Authorization).toBeUndefined()
  })

  it('ставит Content-Type: application/json для обычного тела', async () => {
    const f = mockFetch({ jsonData: {} })

    await apiFetch('/api/x', { method: 'POST', body: JSON.stringify({ a: 1 }) })

    expect(sentHeaders(f)['Content-Type']).toBe('application/json')
  })

  it('НЕ ставит Content-Type для FormData (boundary выставит браузер)', async () => {
    const f = mockFetch({ jsonData: {} })

    await apiFetch('/api/upload', { method: 'POST', body: new FormData() })

    expect(sentHeaders(f)['Content-Type']).toBeUndefined()
  })

  it('на 401 обновляет access-токен и повторяет исходный запрос', async () => {
    localStorage.setItem('token', 'jwt-old')
    localStorage.setItem('user', '{"id":"u1"}')
    const f = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'expired' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ token: 'jwt-new' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', f)
    const onRefreshed = vi.fn()
    window.addEventListener('auth:refreshed', onRefreshed)

    await expect(apiFetch('/api/x')).resolves.toEqual({ ok: true })

    expect(f).toHaveBeenCalledTimes(3)
    expect(f.mock.calls[1][0]).toContain('/api/auth/refresh')
    expect((f.mock.calls[2][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer jwt-new' })
    expect(localStorage.getItem('token')).toBe('jwt-new')
    expect(onRefreshed).toHaveBeenCalledOnce()
    window.removeEventListener('auth:refreshed', onRefreshed)
  })

  it('для параллельных 401 выполняет только один refresh-запрос', async () => {
    localStorage.setItem('token', 'jwt-old')
    localStorage.setItem('user', '{"id":"u1"}')
    let refreshCalls = 0
    const f = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1
        return { ok: true, status: 200, json: async () => ({ token: 'jwt-new' }) }
      }
      const auth = (init.headers as Record<string, string>).Authorization
      if (auth === 'Bearer jwt-old') {
        return { ok: false, status: 401, json: async () => ({ error: 'expired' }) }
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }) }
    })
    vi.stubGlobal('fetch', f)

    await Promise.all([apiFetch('/api/a'), apiFetch('/api/b')])

    expect(refreshCalls).toBe(1)
  })

  it('если refresh отклонён, чистит сессию и шлёт auth:unauthorized', async () => {
    localStorage.setItem('token', 'jwt-1')
    localStorage.setItem('user', '{"id":"u1"}')
    mockFetch({ ok: false, status: 401, jsonData: { error: 'expired' } })
    const onUnauth = vi.fn()
    window.addEventListener('auth:unauthorized', onUnauth)

    await expect(apiFetch('/api/x')).rejects.toThrow('expired')

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(onUnauth).toHaveBeenCalledOnce()
    window.removeEventListener('auth:unauthorized', onUnauth)
  })

  it('401 без токена (логин/регистрация) НЕ чистит сессию', async () => {
    // login/register 401 (неверный код) не должен триггерить разлогин
    const onUnauth = vi.fn()
    window.addEventListener('auth:unauthorized', onUnauth)
    mockFetch({ ok: false, status: 401, jsonData: { error: 'bad code' } })

    await expect(apiFetch('/api/auth/verify-code', { method: 'POST' })).rejects.toThrow('bad code')

    expect(onUnauth).not.toHaveBeenCalled()
    window.removeEventListener('auth:unauthorized', onUnauth)
  })

  it('кидает Error(body.error) на не-ok ответ', async () => {
    mockFetch({ ok: false, status: 400, jsonData: { error: 'bad request' } })

    await expect(apiFetch('/api/x')).rejects.toThrow('bad request')
  })

  it('возвращает undefined на 204 No Content', async () => {
    mockFetch({ ok: true, status: 204, jsonData: undefined })

    await expect(apiFetch('/api/x')).resolves.toBeUndefined()
  })

  it('возвращает распарсенный JSON на успехе', async () => {
    mockFetch({ ok: true, status: 200, jsonData: { id: 1, name: 'x' } })

    await expect(apiFetch('/api/x')).resolves.toEqual({ id: 1, name: 'x' })
  })
})
