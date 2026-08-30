import {
  WebAuthnAbortService,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import { passkeysApi, type PasskeyMediation } from '@/features/passkeys/api'

export function supportsPasskeys() {
  return browserSupportsWebAuthn()
}

export async function supportsConditionalPasskeys() {
  return browserSupportsWebAuthn() && browserSupportsWebAuthnAutofill()
}

export function cancelPasskeyCeremony() {
  WebAuthnAbortService.cancelCeremony()
}

export async function authenticateWithPasskey(mediation: PasskeyMediation) {
  const ceremony = await passkeysApi.loginOptions(mediation)
  const credential = await startAuthentication({
    optionsJSON: ceremony.options,
    useBrowserAutofill: mediation === 'conditional',
  })
  return passkeysApi.verifyLogin(ceremony.ceremony_id, credential)
}

export async function registerPasskey(name?: string) {
  const ceremony = await passkeysApi.registrationOptions()
  const credential = await startRegistration({ optionsJSON: ceremony.options })
  return passkeysApi.verifyRegistration(ceremony.ceremony_id, credential, name)
}

export function isPasskeyCancellation(error: unknown) {
  return error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError')
}
