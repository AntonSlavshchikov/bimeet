import {
  Bell,
  CalendarCheck,
  CalendarPlus,
  Clock,
  MessageCircle,
  Pencil,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

const ICON_BY_TYPE: Record<string, LucideIcon> = {
  event_invite: CalendarPlus,
  event_joined: UserPlus,
  event_updated: Pencil,
  event_completed: CalendarCheck,
  event_reminder_3d: Clock,
  event_reminder_1d: Clock,
  collection_contribution_pending: Wallet,
  collection_contribution_confirmed: Wallet,
  collection_contribution_rejected: Wallet,
  chat_message: MessageCircle,
}

export function notificationIcon(type: string): LucideIcon {
  return ICON_BY_TYPE[type] ?? Bell
}
