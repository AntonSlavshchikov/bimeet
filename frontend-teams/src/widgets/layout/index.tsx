import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Bell, Calendar, LogOut, Settings, Users } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useNotifications } from '@/entities/notification/queries'
import { cn } from '@/shared/lib/cn'
import { initials } from '@/shared/lib/initials'

function RailIcon({
  to,
  icon,
  label,
  badge,
}: {
  to: string
  icon: ReactNode
  label: string
  badge?: number
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'relative flex items-center justify-center h-[42px] w-[42px] rounded-[11px] transition',
          isActive ? 'bg-accent/10 text-accent' : 'text-ink-3 hover:bg-hover hover:text-ink-2',
        )
      }
    >
      {icon}
      {badge ? (
        <span className="absolute top-1.5 right-1.5 h-[7px] w-[7px] rounded-full bg-danger ring-2 ring-surface" />
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
    <div className="h-screen grid grid-cols-[64px_1fr] overflow-hidden bg-bg-2">
      {/* ICON RAIL */}
      <nav className="flex flex-col items-center gap-1 py-3.5 bg-surface border-r border-line">
        <Link
          to="/"
          title={company?.name}
          className="mb-3 h-[38px] w-[38px] rounded-[11px] bg-accent text-white flex items-center justify-center overflow-hidden shrink-0"
        >
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[17px] font-bold">{(company?.name ?? 'B').slice(0, 1).toUpperCase()}</span>
          )}
        </Link>

        <RailIcon to="/" icon={<Calendar size={20} />} label="Встречи" />
        {isOwner && <RailIcon to="/team" icon={<Users size={20} />} label="Команда" />}
        <RailIcon to="/notifications" icon={<Bell size={20} />} label="Уведомления" badge={unread} />
        {isOwner && <RailIcon to="/settings" icon={<Settings size={20} />} label="Настройки" />}

        <div className="mt-auto flex flex-col items-center gap-2">
          <div
            title={user?.name}
            className="h-[34px] w-[34px] rounded-full bg-accent text-white flex items-center justify-center text-[11px] font-bold"
          >
            {initials(user?.name)}
          </div>
          <button
            onClick={logout}
            title="Выйти"
            aria-label="Выйти"
            className="flex items-center justify-center h-[34px] w-[34px] rounded-[11px] text-ink-3 hover:bg-hover hover:text-ink-2 transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main className="min-w-0 overflow-hidden">{children}</main>
    </div>
  )
}
