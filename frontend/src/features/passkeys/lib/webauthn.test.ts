import { beforeEach, describe, expect, it, vi } from 'vitest'

const browserMocks = vi.hoisted(() => ({
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
  browserSupportsWebAuthn: vi.fn(),
  browserSupportsWebAuthnAutofill: vi.fn(),
  cancelCeremony: vi.fn(),
}))

const apiMocks = vi.hoisted(() => ({
  loginOptions: vi.fn(),
  verifyLogin: vi.fn(),
  registrationOptions: vi.fn(),
  verifyRegistration: vi.fn(),
}))

vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: browserMocks.startAuthentication,
  startRegistration: browserMocks.startRegistration,
  browserSupportsWebAuthn: browserMocks.browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill: browserMocks.browserSupportsWebAuthnAutofill,
  WebAuthnAbortService: { cancelCeremony: browserMocks.cancelCeremony },
}))

vi.mock('@/features/passkeys/api', () => ({
  passkeysApi: apiMocks,
}))

import {
  authenticateWithPasskey,
  cancelPasskeyCeremony,
  registerPasskey,
  supportsConditionalPasskeys,
  supportsPasskeys,
} from './webauthn'

describe('passkey browser ceremonies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('detects unsupported and conditional-capable browsers', async () => {
    browserMocks.browserSupportsWebAuthn.mockReturnValue(false)
    expect(supportsPasskeys()).toBe(false)
    expect(await supportsConditionalPasskeys()).toBe(false)
    expect(browserMocks.browserSupportsWebAuthnAutofill).not.toHaveBeenCalled()

    browserMocks.browserSupportsWebAuthn.mockReturnValue(true)
    browserMocks.browserSupportsWebAuthnAutofill.mockResolvedValue(true)
    expect(supportsPasskeys()).toBe(true)
    expect(await supportsConditionalPasskeys()).toBe(true)
  })

  it.each([
    ['default', false],
    ['conditional', true],
  ] as const)('runs the %s authentication flow', async (mediation, useBrowserAutofill) => {
    const options = { challenge: 'challenge' }
    const credential = { id: 'credential' }
    const auth = { token: 'jwt', user: { id: 'u1' }, has_passkeys: true }
    apiMocks.loginOptions.mockResolvedValue({ ceremony_id: 'ceremony', options })
    browserMocks.startAuthentication.mockResolvedValue(credential)
    apiMocks.verifyLogin.mockResolvedValue(auth)

    await expect(authenticateWithPasskey(mediation)).resolves.toBe(auth)
    expect(apiMocks.loginOptions).toHaveBeenCalledWith(mediation)
    expect(browserMocks.startAuthentication).toHaveBeenCalledWith({ optionsJSON: options, useBrowserAutofill })
    expect(apiMocks.verifyLogin).toHaveBeenCalledWith('ceremony', credential)
  })

  it('runs registration and can cancel a pending ceremony', async () => {
    const options = { challenge: 'challenge' }
    const credential = { id: 'new-credential' }
    apiMocks.registrationOptions.mockResolvedValue({ ceremony_id: 'registration', options })
    browserMocks.startRegistration.mockResolvedValue(credential)
    apiMocks.verifyRegistration.mockResolvedValue({ id: 'p1' })

    await registerPasskey('Laptop')
    expect(apiMocks.verifyRegistration).toHaveBeenCalledWith('registration', credential, 'Laptop')

    cancelPasskeyCeremony()
    expect(browserMocks.cancelCeremony).toHaveBeenCalledOnce()
  })
})
