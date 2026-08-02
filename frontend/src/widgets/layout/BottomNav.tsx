import { Link, useMatch } from 'react-router-dom'
import { Bell, Calendar, Search, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@/entities/notification/queries'
import { cn } from '@/shared/lib/cn'
import { primaryNavRoutes } from './model/primary-navigation'

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
  const { data: notifications = [] } = useNotifications()
  const unread = notifications.filter(n => !n.is_read).length

  return (
    <nav
      className={cn(
        'fixed inset-x-2 bottom-2 z-40 grid grid-cols-4 rounded-[18px] border border-line bg-surface/90 pt-2 shadow-[0_8px_28px_rgba(36,30,20,0.10)] backdrop-blur-md min-[761px]:hidden max-[420px]:inset-x-[6px]',
      )}
      style={{
        paddingBottom: `calc(8px + env(safe-area-inset-bottom))`,
      }}
    >
      <TabLink to={primaryNavRoutes.discover} icon={Search} label={t('nav.publicEvents')} />
      <TabLink to={primaryNavRoutes.events} icon={Calendar} label={t('nav.events')} />
      <TabLink to={primaryNavRoutes.notifications} icon={Bell} label={t('nav.notificationsShort', 'Уведом.')} badge={unread} />
      <TabLink to={primaryNavRoutes.profile} icon={User} label={t('nav.profile')} />
    </nav>
  )
}
