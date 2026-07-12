import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Calendar,
  Globe,
  LogOut,
  MoreHorizontal,
  Search,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { isAdmin } from '@/features/auth/lib/isAdmin'
import { useNotifications } from '@/entities/notification/queries'
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
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  count?: number
  /** Badge в акцентном цвете (для непрочитанных уведомлений). */
  accentBadge?: boolean
  active?: boolean
  onClick?: () => void
}

function NavItem({ to, icon: Icon, label, count, accentBadge, active, onClick }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-[13.5px] transition select-none',
        active
          ? 'bg-hover text-ink font-semibold'
          : 'text-ink-2 font-medium hover:bg-hover hover:text-ink',
      )}
    >
      <Icon size={16} className={cn('shrink-0', active ? 'text-accent' : 'text-ink-3')} />
      <span className="truncate">{label}</span>
      {count != null && count > 0 && (
        <span
          className={cn(
            'ml-auto rounded-full px-1.5 text-[11px] font-semibold tnum',
            accentBadge
              ? 'bg-accent text-white'
              : active
                ? 'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-accent'
                : 'bg-line-soft text-ink-3',
          )}
        >
          {accentBadge && count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
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

  const onEvents = location.pathname.startsWith('/events') && !location.pathname.includes('/new')
  const onDiscover = location.pathname.startsWith('/discover')

  function handleLogout() {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <aside className="h-full flex flex-col bg-bg border-r border-line">
      {/* Brand */}
      <div className="flex items-center gap-2 px-3 pt-5 pb-4">
        <img src="/logo-mark.svg" alt="" className="w-10 h-auto shrink-0" />
        <div className="text-[15.5px] font-bold tracking-[-0.01em] text-ink" style={{ fontFamily: 'var(--font-wordmark)' }}>
          bimeet
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-px px-3">
        <NavItem
          to="/discover"
          icon={Search}
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
          count={unreadCount}
          accentBadge
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

      {/* Spacer */}
      <div className="flex-1" />

      {/* User pill */}
      {user && (
        <div className="px-3 pb-4 border-t border-line pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-2.5 rounded-[8px] px-2 py-2 hover:bg-hover transition focus-ring"
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
    </aside>
  )
}
