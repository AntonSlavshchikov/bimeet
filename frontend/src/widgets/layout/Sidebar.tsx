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
import { Avatar } from '@/shared/ui/avatar'
import { BrandMark } from '@/shared/ui/brand-mark'
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
      {Icon && <Icon size={16} className={cn('shrink-0', active ? 'text-ink' : 'text-ink-3')} />}
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

  const onEvents = location.pathname.startsWith('/events') && !location.pathname.includes('/new')
  const onDiscover = location.pathname.startsWith('/discover')

  function handleLogout() {
    logout()
    navigate('/login')
    onClose?.()
  }

  return (
    <aside className="h-full flex flex-col border-r border-line bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-bg))] px-[14px] pt-[22px] pb-[15px]">
      {/* Brand */}
      <div className="flex items-center gap-2 px-2 pb-5">
        <BrandMark size={40} />
        <div className="text-[15px] font-bold tracking-[-0.02em] text-ink">bimeet</div>
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
    </aside>
  )
}
