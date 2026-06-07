const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8090'

function getToken(): string | null {
  return localStorage.getItem('token')
}

// apiFetch is the single HTTP entry point for the Teams frontend. It attaches
// the bearer token, throws Error(body.error) on failure, and clears the session
// on a 401 so the router can bounce to /login.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    const body = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
