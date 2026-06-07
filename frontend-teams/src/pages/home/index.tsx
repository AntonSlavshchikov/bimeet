import { LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/shared/ui'

// Placeholder workspace home. Real events list / owner panel land in Этап 36.
export default function HomePage() {
  const { user, company, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="h-14 border-b border-line bg-surface flex items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-7 object-contain" />
          ) : (
            <div className="h-7 w-7 rounded-[8px] bg-accent text-white flex items-center justify-center text-[13px] font-bold">
              {(company?.name ?? 'B').slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-[14px] font-semibold text-ink">{company?.name}</span>
        </div>
        <Button variant="ghost" onClick={logout} className="h-9 px-3">
          <LogOut size={15} /> Выйти
        </Button>
      </header>

      <main className="max-w-[720px] mx-auto px-5 py-10">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Привет, {user?.name}
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-3">
          Вы вошли в пространство «{company?.name}» как{' '}
          <span className="font-semibold text-ink-2">{user?.role === 'owner' ? 'владелец' : 'сотрудник'}</span>.
        </p>

        <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-2">
            Скоро здесь
          </div>
          <ul className="text-[14px] text-ink-2 space-y-1.5">
            <li>• Деловые встречи: список, детальная, создание</li>
            <li>• Участники, ссылки на материалы, опросы</li>
            <li>• Уведомления</li>
            {user?.role === 'owner' && <li>• Панель владельца: бренд и управление сотрудниками</li>}
          </ul>
          <p className="mt-3 text-[12.5px] text-ink-3">
            Бэкенд этих функций уже готов (Этап 34) — UI добавим в Этапе 36.
          </p>
        </div>
      </main>
    </div>
  )
}
