import { beforeEach, describe, expect, it } from 'vitest'
import { claimPasskeyEnrollmentHint } from './enrollmentPrompt'

describe('passkey enrollment hint', () => {
  beforeEach(() => localStorage.clear())

  it('is shown once per user', () => {
    expect(claimPasskeyEnrollmentHint('user-a')).toBe(true)
    expect(claimPasskeyEnrollmentHint('user-a')).toBe(false)
    expect(claimPasskeyEnrollmentHint('user-b')).toBe(true)
  })
})
