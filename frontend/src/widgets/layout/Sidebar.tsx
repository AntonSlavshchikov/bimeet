import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Calendar,
  Compass,
  Globe,
  LogOut,
  MoreHorizontal,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { isAdmin } from '@/features/auth/lib/isAdmin'
import { useNotifications } from '@/entities/notification/queries'
import { useEvents } from '@/entities/event/queries'
import { Avatar } from '@/shared/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { cn } from '@/shared/lib/cn'

interface NavItemProps {
  to: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  label: string
  active?: boolean
  onClick?: () => void
}

function NavItem({ to, icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'group my-px flex min-w-0 items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[12.5px] font-semibold transition select-none',
        active
          ? 'bg-bg-2 text-ink'
          : 'text-ink-2 hover:bg-hover hover:text-ink',
      )}
    >
      {Icon && <Icon size={16} className={cn('shrink-0', active ? 'text-accent' : 'text-ink-3')} />}
      <span className="truncate">{label}</span>
    </Link>
  )
}

function NavSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-[9px] mb-1.5 mt-[11px] text-[9px] font-bold uppercase tracking-[0.11em] text-ink-3">
      {children}
    </div>
  )
}

interface SidebarProps {
  /** Колбэк закрытия (если sidebar внутри Drawer). На текущем layout всегда no-op. */
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps = {}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const isRu = i18n.language === 'ru'

  const { data: notifications = [] } = useNotifications()
  const unreadCount = notifications.filter(n => !n.is_read).length

  const events = useEvents()
  const attendingCount = events.filter(e => !e.organizer.is_me && e.status !== 'completed').length
  const organizingCount = events.filter(e => e.organizer.is_me && e.status !== 'completed').length
  const pastCount = events.filter(e => e.status === 'completed').length

  const onEvents = location.pathname.startsWith('/events') && !location.pathname.includes('/new')
  const onDiscover = location.pathname.startsWith('/discover')
  const activeTab = onEvents ? new URLSearchParams(location.search).get('tab') ?? 'all' : null

  function handleLogout() {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2 px-3 pt-5 pb-4">
        <img src="/logo-mark.svg" alt="" className="w-10 h-auto shrink-0" />
        <div className="text-[15.5px] font-bold tracking-[-0.01em] text-ink" style={{ fontFamily: 'var(--font-wordmark)' }}>
          bimeet
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col">
        <NavSectionTitle>{t('nav.navigation')}</NavSectionTitle>

        <NavItem
          to="/discover"
          icon={Compass}
          label={t('nav.publicEvents', 'Все встречи')}
          active={onDiscover}
          onClick={onClose}
        />

        <NavItem
          to="/events"
          icon={Calendar}
          label={t('nav.events', 'Мои встречи')}
          active={onEvents}
          onClick={onClose}
        />

        <NavItem
          to="/notifications"
          icon={Bell}
          label={t('nav.notifications', 'Уведомления')}
          active={location.pathname.startsWith('/notifications')}
          onClick={onClose}
        />

        {isAdmin(user) && (
          <NavItem
            to="/admin"
            icon={BarChart3}
            label={t('nav.admin', 'Админка')}
            active={location.pathname.startsWith('/admin')}
            onClick={onClose}
          />
        )}

      </nav>

      {/* Filters */}
      <div className="mt-5 px-3">
        <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.04em] text-ink-4 uppercase">
          {t('nav.filters', 'Фильтры')}
        </div>
        <nav className="flex flex-col gap-px">
          <NavItem
            to="/events?tab=attending"
            label={t('events.tabAttending', 'Иду')}
            count={attendingCount}
            active={activeTab === 'attending'}
            onClick={onClose}
          />
          <NavItem
            to="/events?tab=organizing"
            label={t('events.tabOrganizing', 'Организую')}
            count={organizingCount}
            active={activeTab === 'organizing'}
            onClick={onClose}
          />
          <NavItem
            to="/events?tab=past"
            label={t('events.tabPast', 'Прошедшие')}
            count={pastCount}
            active={activeTab === 'past'}
            onClick={onClose}
          />
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User pill */}
      {user && (
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-[9px] rounded-[13px] bg-bg-2 p-2.5 hover:bg-hover transition focus-ring"
              >
                <Avatar name={user.name} src={user.avatar_url} size="md" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[13px] font-semibold leading-[1.2] truncate text-ink">{user.name}</div>
                  <div className="text-[11px] text-ink-3 leading-[1.2] truncate">{user.email}</div>
                </div>
                <MoreHorizontal size={14} className="text-ink-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-[224px]">
              <DropdownMenuLabel>{t('common.account', 'Аккаунт')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => { navigate('/profile'); onClose?.() }}>
                <User size={14} className="text-ink-3" />
                {t('nav.profile', 'Профиль')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => i18n.changeLanguage(isRu ? 'en' : 'ru')}>
                <Globe size={14} className="text-ink-3" />
                {isRu ? 'English' : 'Русский'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={handleLogout}>
                <LogOut size={14} />
                {t('common.logout', 'Выйти')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
