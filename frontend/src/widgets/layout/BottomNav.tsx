import { Link, useMatch } from 'react-router-dom'
import { Calendar, Search, User, BarChart3, Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { isAdmin } from '@/features/auth/lib/isAdmin'
import { useNotifications } from '@/entities/notification/queries'
import { cn } from '@/shared/lib/cn'

interface TabProps {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  badge?: number
}

function TabLink({ to, icon: Icon, label, badge }: TabProps) {
  const active = !!useMatch({ path: to, end: false })
  return (
    <Link
      to={to}
      className={cn(
        'relative flex flex-col items-center justify-center gap-0.5 py-1 transition select-none',
        active ? 'text-accent' : 'text-ink-3',
      )}
    >
      <Icon size={22} className="shrink-0" />
      <span className={cn('text-[10px]', active ? 'font-semibold' : 'font-medium')}>{label}</span>
      {badge != null && badge > 0 && (
        <span
          className="absolute top-0.5 right-[calc(50%-18px)] inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-white tnum"
          aria-hidden
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

export default function BottomNav() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const showAdmin = isAdmin(user)
  const { data: notifications = [] } = useNotifications()
  const unread = notifications.filter(n => !n.is_read).length

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-50',
        'border-t border-line bg-surface/[0.82] backdrop-blur-xl backdrop-saturate-150',
        'grid pt-2',
      )}
      style={{
        paddingBottom: `calc(8px + env(safe-area-inset-bottom))`,
        gridTemplateColumns: `repeat(${showAdmin ? 5 : 4}, 1fr)`,
      }}
    >
      <TabLink to="/discover" icon={Search} label={t('nav.publicEventsShort', 'Все')} />
      <TabLink to="/events" icon={Calendar} label={t('nav.events')} />
      <TabLink to="/notifications" icon={Bell} label={t('nav.notificationsShort', 'Уведом.')} badge={unread} />
      <TabLink to="/profile" icon={User} label={t('nav.profile')} />
      {showAdmin && <TabLink to="/admin" icon={BarChart3} label={t('nav.admin')} />}
    </nav>
  )
}
