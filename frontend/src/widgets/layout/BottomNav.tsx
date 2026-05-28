import { Link, useMatch } from 'react-router-dom'
import { Calendar, User, BarChart3, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { isAdmin } from '@/features/auth/lib/isAdmin'
import { useNotifications } from '@/entities/notification/queries'
import NotificationCenter from '@/features/notifications/ui/NotificationCenter'
import { cn } from '@/shared/lib/cn'

interface TabProps {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
}

function TabLink({ to, icon: Icon, label }: TabProps) {
  const active = !!useMatch({ path: to, end: false })
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 py-1 transition select-none',
        active ? 'text-accent' : 'text-ink-3',
      )}
    >
      <Icon size={22} className="shrink-0" />
      <span className={cn('text-[10px]', active ? 'font-semibold' : 'font-medium')}>{label}</span>
    </Link>
  )
}

/** «Уведомления» — не route, а popover triger (NotificationCenter с кастомным triggerm) */
function TabNotifications() {
  const { t } = useTranslation()
  const { data: notifications = [] } = useNotifications()
  const unread = notifications.filter(n => !n.is_read).length
  return (
    <NotificationCenter
      renderTrigger={() => (
        <button
          type="button"
          className="relative flex flex-col items-center justify-center gap-0.5 py-1 transition select-none w-full focus-ring text-ink-3 cursor-pointer hover:text-ink-2"
        >
          <Bell size={22} className="shrink-0" />
          <span className="text-[10px] font-medium">{t('nav.notifications', 'Уведом.')}</span>
          {unread > 0 && (
            <span
              className="absolute top-0.5 right-[calc(50%-18px)] inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-white tnum"
              aria-hidden
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}
    />
  )
}

export default function BottomNav() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const showAdmin = isAdmin(user)
  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-50',
        'border-t border-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150',
        'grid pt-2',
      )}
      style={{
        paddingBottom: `calc(8px + env(safe-area-inset-bottom))`,
        gridTemplateColumns: `repeat(${showAdmin ? 4 : 3}, 1fr)`,
      }}
    >
      <TabLink to="/events" icon={Calendar} label={t('nav.events')} />
      <TabNotifications />
      <TabLink to="/profile" icon={User} label={t('nav.profile')} />
      {showAdmin && <TabLink to="/admin" icon={BarChart3} label={t('nav.admin')} />}
    </nav>
  )
}
