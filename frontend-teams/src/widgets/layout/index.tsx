import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Bell, Calendar, LogOut, Settings, Users } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useNotifications } from '@/entities/notification/queries'
import { cn } from '@/shared/lib/cn'

const navBase =
  'inline-flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-control)] text-[13.5px] font-medium transition'

function NavItem({ to, icon, label, badge }: { to: string; icon: ReactNode; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(navBase, isActive ? 'bg-accent/10 text-accent' : 'text-ink-2 hover:bg-hover')
      }
    >
      {icon}
      <span>{label}</span>
      {badge ? (
        <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[11px] font-semibold flex items-center justify-center">
          {badge}
        </span>
      ) : null}
    </NavLink>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, company, logout } = useAuth()
  const { data: notifications } = useNotifications()
  const unread = notifications?.filter(n => !n.is_read).length ?? 0
  const isOwner = user?.role === 'owner'

  return (
    <div className="min-h-screen">
      <header className="h-14 border-b border-line bg-surface sticky top-0 z-30">
        <div className="max-w-[920px] mx-auto h-full px-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-7 object-contain" />
            ) : (
              <div className="h-7 w-7 rounded-[8px] bg-accent text-white flex items-center justify-center text-[13px] font-bold">
                {(company?.name ?? 'B').slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="text-[14px] font-semibold text-ink hidden sm:block">{company?.name}</span>
          </Link>

          <nav className="flex items-center gap-1 ml-2">
            <NavItem to="/" icon={<Calendar size={15} />} label="Встречи" />
            <NavItem to="/notifications" icon={<Bell size={15} />} label="Уведомления" badge={unread} />
            {isOwner && <NavItem to="/team" icon={<Users size={15} />} label="Команда" />}
            {isOwner && <NavItem to="/settings" icon={<Settings size={15} />} label="Настройки" />}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[13px] text-ink-3 hidden sm:block">{user?.name}</span>
            <button
              onClick={logout}
              title="Выйти"
              className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-control)] text-ink-2 hover:bg-hover transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[920px] mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
