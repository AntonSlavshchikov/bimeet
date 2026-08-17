export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

interface RefreshResponse {
  token: string
}

let refreshPromise: Promise<string | null> | null = null

export function getToken(): string | null {
  return localStorage.getItem('token')
}

function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.dispatchEvent(new Event('auth:unauthorized'))
}

async function sendRequest(path: string, options: RequestInit, token: string | null): Promise<Response> {
  // Don't set Content-Type for FormData — browser sets it with the multipart boundary
  const defaultHeaders: Record<string, string> = options.body instanceof FormData
    ? {}
    : { 'Content-Type': 'application/json' }
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: options.credentials ?? 'include',
    headers: {
      ...defaultHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) return null

        const body = await res.json() as RefreshResponse
        if (!body.token) return null

        localStorage.setItem('token', body.token)
        window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { token: body.token } }))
        return body.token
      } catch {
        return null
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const res = await sendRequest(path, options, token)

  if (res.status === 401 && token) {
    // If another request has already refreshed the session, reuse its token.
    // Otherwise all concurrent 401s share one refresh request so the rotating
    // refresh token is consumed exactly once.
    const latestToken = getToken()
    const nextToken = latestToken && latestToken !== token
      ? latestToken
      : await refreshAccessToken()

    if (nextToken) {
      const retry = await sendRequest(path, options, nextToken)
      if (retry.status !== 401) return parseResponse<T>(retry)
    }

    clearSession()
  }

  return parseResponse<T>(res)
}
