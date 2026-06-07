// Resolving the current company subdomain.
//
// Local development uses *.lvh.me (resolves to 127.0.0.1):
//   acme.lvh.me:5174     → company "acme"
//   company.lvh.me:5174  → registration host (no company)
//   localhost:5174       → registration host (no company)
//
// In production the same logic applies to *.bimeet.pro. Hosts that are not a
// company (the registration entry point and technical names) yield null.

const RESERVED = new Set(['company', 'app', 'www', 'api', 'admin', 'auth'])

// Bare hosts that never carry a company label.
const BARE_HOSTS = new Set(['localhost', 'lvh.me', 'bimeet.pro'])

export function resolveSubdomain(): string | null {
  // Dev override: VITE_DEV_SUBDOMAIN forces a company regardless of host.
  const override = import.meta.env.VITE_DEV_SUBDOMAIN as string | undefined
  if (override) return override.toLowerCase()

  const host = window.location.hostname.toLowerCase()
  if (BARE_HOSTS.has(host)) return null

  const labels = host.split('.')
  // Need at least sub.domain.tld (3 labels) or sub.lvh.me (3 labels).
  if (labels.length < 2) return null

  const sub = labels[0]
  if (!sub || RESERVED.has(sub)) return null
  return sub
}

// isRegistrationHost is true on the company.* / bare host where new companies sign up.
export function isRegistrationHost(): boolean {
  return resolveSubdomain() === null
}

// workspaceUrl builds the absolute URL of a company's workspace on the current
// host pattern (used to redirect after registration). Preserves port + scheme.
export function workspaceUrl(subdomain: string): string {
  const { protocol, hostname, port } = window.location
  const labels = hostname.split('.')
  // Replace/prepend the first label with the target subdomain.
  const base = BARE_HOSTS.has(hostname) ? hostname : labels.slice(1).join('.')
  const portPart = port ? `:${port}` : ''
  return `${protocol}//${subdomain}.${base}${portPart}`
}
