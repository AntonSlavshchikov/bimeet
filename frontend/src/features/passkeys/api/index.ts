import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser'
import type { AuthResponse } from '@/features/auth/api'
import { apiFetch } from '@/shared/api/client'

export type PasskeyMediation = 'default' | 'conditional'

export interface Passkey {
  id: string
  name: string
  created_at: string
  last_used_at?: string | null
}

export interface PasskeyOptions<T> {
  ceremony_id: string
  options: T
}

export const passkeysApi = {
  config: () => apiFetch<{ enabled: boolean }>('/api/auth/passkeys/config'),

  loginOptions: (mediation: PasskeyMediation) =>
    apiFetch<PasskeyOptions<PublicKeyCredentialRequestOptionsJSON>>('/api/auth/passkeys/login/options', {
      method: 'POST',
      body: JSON.stringify({ mediation }),
    }),

  verifyLogin: (ceremonyId: string, credential: AuthenticationResponseJSON) =>
    apiFetch<AuthResponse>('/api/auth/passkeys/login/verify', {
      method: 'POST',
      body: JSON.stringify({ ceremony_id: ceremonyId, credential }),
    }),

  list: () => apiFetch<Passkey[]>('/api/auth/me/passkeys'),

  registrationOptions: () =>
    apiFetch<PasskeyOptions<PublicKeyCredentialCreationOptionsJSON>>('/api/auth/me/passkeys/registration/options', {
      method: 'POST',
    }),

  verifyRegistration: (ceremonyId: string, credential: RegistrationResponseJSON, name?: string) =>
    apiFetch<Passkey>('/api/auth/me/passkeys/registration/verify', {
      method: 'POST',
      body: JSON.stringify({ ceremony_id: ceremonyId, credential, name }),
    }),

  rename: (id: string, name: string) =>
    apiFetch<Passkey>(`/api/auth/me/passkeys/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  remove: (id: string) =>
    apiFetch<void>(`/api/auth/me/passkeys/${id}`, { method: 'DELETE' }),
}
