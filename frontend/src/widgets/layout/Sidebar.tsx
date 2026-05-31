import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  Clock,
  Globe,
  Heart,
  LogOut,
  MoreHorizontal,
  Search,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { isAdmin } from '@/features/auth/lib/isAdmin'
import { useEvents, usePublicEvents } from '@/entities/event/queries'
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

function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
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
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const isRu = i18n.language === 'ru'

  const events = useEvents()
  const publicEvents = usePublicEvents()
  const { data: notifications = [] } = useNotifications()
  const unreadCount = notifications.filter(n => !n.is_read).length

  const myEvents = events.filter(e => e.status !== 'completed')
  const attendingCount = myEvents.filter(e => e.organizer.id !== user?.id).length
  const organizingCount = myEvents.filter(e => e.organizer.id === user?.id).length
  const pastCount = events.filter(e => e.status === 'completed').length
  const publicCount = (publicEvents ?? []).length

  const onEvents = location.pathname.startsWith('/events') && !location.pathname.includes('/new')
  const currentTab = onEvents ? searchParams.get('tab') : null

  function isFilter(tab: string) {
    return onEvents && currentTab === tab
  }

  function handleLogout() {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <aside className="h-full flex flex-col bg-bg border-r border-line">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3 pt-5 pb-4">
        <div className="w-7 h-7 rounded-lg bg-ink text-bg flex items-center justify-center font-bold text-[14px] tracking-[-0.02em]">
          B
        </div>
        <div className="text-[15px] font-semibold tracking-[-0.015em] text-ink">Bimeet</div>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-px px-3">
        <NavItem
          to="/events"
          icon={Calendar}
          label={t('nav.events', 'Встречи')}
          count={myEvents.length}
          active={onEvents && !currentTab}
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

        <NavItem
          to="/events?tab=public"
          icon={Search}
          label={t('nav.publicEvents', 'Найти публичные')}
          count={publicCount > 0 ? publicCount : undefined}
          active={isFilter('public')}
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
      <nav className="flex flex-col gap-px px-3">
        <NavLabel>{t('nav.filtersLabel', 'Фильтры')}</NavLabel>
        <NavItem
          to="/events?tab=attending"
          icon={Heart}
          label={t('nav.attending', 'Иду')}
          count={attendingCount}
          active={isFilter('attending')}
          onClick={onClose}
        />
        <NavItem
          to="/events?tab=organizing"
          icon={Activity}
          label={t('nav.organizing', 'Организую')}
          count={organizingCount}
          active={isFilter('organizing')}
          onClick={onClose}
        />
        <NavItem
          to="/events?tab=past"
          icon={Clock}
          label={t('nav.past', 'Прошедшие')}
          count={pastCount}
          active={isFilter('past')}
          onClick={onClose}
        />
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
