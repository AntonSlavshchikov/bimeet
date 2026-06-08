// initials returns up to two uppercase letters from a person's name,
// used for avatar fallbacks throughout the app.
export function initials(name: string | undefined | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const letters = parts.slice(0, 2).map(p => p.charAt(0).toUpperCase())
  return letters.join('')
}
