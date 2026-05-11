import type { User } from '@/entities/user/model/types'

function parseAdminEmails(): Set<string> {
  const raw = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? ''
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

const adminEmails = parseAdminEmails()

export function isAdmin(user: User | null | undefined): boolean {
  if (!user?.email) return false
  return adminEmails.has(user.email.toLowerCase())
}
