// Cross-subdomain token hand-off.
//
// Registration happens on the registration host (company.lvh.me), but the new
// owner's workspace lives on a different origin ({sub}.lvh.me) with its own
// localStorage. After registering we redirect to the workspace with the token
// in the URL hash (#token=...); on load there we move it into localStorage and
// scrub the URL. Same trick is unnecessary for login/accept-invite (already on
// the company origin), but harmless.

export function bootstrapTokenFromHash() {
  const hash = window.location.hash
  const match = hash.match(/[#&]token=([^&]+)/)
  if (!match) return
  const token = decodeURIComponent(match[1])
  localStorage.setItem('token', token)
  // Remove the token from the URL without reloading.
  const clean = window.location.pathname + window.location.search
  window.history.replaceState(null, '', clean)
}
