import { Link, useMatch } from 'react-router-dom'
import { BarChart3, Calendar, MessageCircle, Search, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { isAdmin } from '@/features/auth/lib/isAdmin'
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
  const { user } = useAuth()
  const showAdmin = isAdmin(user)

  return (
    <nav
      className={cn(
        'fixed inset-x-3 z-40 grid rounded-full border border-line bg-surface/90 px-2 pt-2 shadow-[0_8px_28px_rgba(36,30,20,0.10)] backdrop-blur-md min-[761px]:hidden',
      )}
      style={{
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: '8px',
        gridTemplateColumns: `repeat(${showAdmin ? 5 : 4}, 1fr)`,
      }}
    >
      <TabLink to={primaryNavRoutes.discover} icon={Search} label={t('nav.publicEventsShort', 'Все')} />
      <TabLink to={primaryNavRoutes.events} icon={Calendar} label={t('nav.events')} />
      <TabLink to={primaryNavRoutes.chats} icon={MessageCircle} label={t('nav.chatsShort', 'Чаты')} />
      <TabLink to={primaryNavRoutes.profile} icon={User} label={t('nav.profile')} />
      {showAdmin && <TabLink to="/admin" icon={BarChart3} label={t('nav.admin')} />}
    </nav>
  )
}
