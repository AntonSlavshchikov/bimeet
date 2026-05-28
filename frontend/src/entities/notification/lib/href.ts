import type { Notification } from '@/entities/notification/model/types'

export function notificationHref(n: Notification): string | null {
  if (!n.event_id) return null
  if (n.type === 'collection_contribution_pending') return `/events/${n.event_id}?tab=collections`
  return `/events/${n.event_id}`
}
