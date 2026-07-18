export interface StoredSession<TUser = unknown> {
  token: string
  user: TUser
  rememberMe: boolean
}

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

function readFrom<TUser>(storage: Storage, rememberMe: boolean): StoredSession<TUser> | null {
  const token = storage.getItem(TOKEN_KEY)
  const userRaw = storage.getItem(USER_KEY)
  if (!token || !userRaw) return null

  try {
    const user = JSON.parse(userRaw) as TUser
    if (user == null) return null
    return { token, user, rememberMe }
  } catch {
    return null
  }
}

/** Reads a complete session pair, preferring the current tab over a remembered session. */
export function readSession<TUser = unknown>(): StoredSession<TUser> | null {
  return readFrom<TUser>(sessionStorage, false) ?? readFrom<TUser>(localStorage, true)
}

export function getSessionToken(): string | null {
  return readSession()?.token ?? null
}

/** Replaces any existing session with a complete pair in the selected storage. */
export function writeSession<TUser>(token: string, user: TUser, rememberMe: boolean): void {
  clearSession()
  const storage = rememberMe ? localStorage : sessionStorage

  try {
    const userRaw = JSON.stringify(user)
    if (userRaw === undefined) throw new TypeError('Session user is not serializable')
    // Token is written last so readers never observe it without its matching user.
    storage.setItem(USER_KEY, userRaw)
    storage.setItem(TOKEN_KEY, token)
  } catch (error) {
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(USER_KEY)
    throw error
  }
}

export function clearSession(): void {
  for (const storage of [sessionStorage, localStorage]) {
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(USER_KEY)
  }
}
