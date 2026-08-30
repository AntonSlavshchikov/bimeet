const promptKey = (userID: string) => `passkey-enrollment-prompt:${userID}`

/** Marks the enrollment hint as shown and returns true only on its first call per user. */
export function claimPasskeyEnrollmentHint(userID: string) {
  const key = promptKey(userID)
  if (localStorage.getItem(key)) return false
  localStorage.setItem(key, '1')
  return true
}
