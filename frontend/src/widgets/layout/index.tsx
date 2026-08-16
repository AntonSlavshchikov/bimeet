import { type ReactNode } from 'react'
import { Bell, Plus, Search } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import NotificationsNavbarActions from '@/features/notifications/ui/NotificationsNavbarActions'
import { useNotifications } from '@/entities/notification/queries'
import { Toaster } from '@/shared/ui/toast'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/cn'

interface LayoutProps {
  children: ReactNode
  /** Опциональная правая панель (RightRail) — на больших экранах ≥xl */
  rail?: ReactNode
  /** Action-кнопки справа в mobile navbar. Заменяют автоматически вычисленные actions по path. */
  mobileActions?: ReactNode
}

function useMobileTitle(t: ReturnType<typeof useTranslation>['t']): string {
  const { pathname } = useLocation()
  if (pathname === '/events') return t('nav.events', 'Мои встречи')
  if (pathname === '/events/new') return t('eventForm.titleCreate', 'Новая встреча')
  if (pathname.startsWith('/events/') && pathname.endsWith('/edit')) return t('eventForm.titleEdit', 'Редактирование')
  if (pathname.startsWith('/events/')) return t('events.title', 'Встреча')
  if (pathname === '/profile') return t('nav.profile', 'Профиль')
  if (pathname === '/admin') return t('nav.admin', 'Админка')
  if (pathname === '/notifications') return t('nav.notifications', 'Уведомления')
  if (pathname === '/chats') return t('nav.chats', 'Чаты')
  if (pathname.startsWith('/chats/')) return t('chats.title', 'Чат')
  return ''
}

/** Контекстные action-кнопки навбара по path. Возвращает JSX или null. */
function useMobileNavbarActions(t: ReturnType<typeof useTranslation>['t']): ReactNode {
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // На странице списка встреч — search-toggle + «+» создания
  if (pathname === '/events') {
    const searchOpen = searchParams.get('search') === '1'
    return (
      <>
        <button
          type="button"
          aria-label={t('events.search', 'Поиск')}
          onClick={() => {
            const next = new URLSearchParams(searchParams)
            if (searchOpen) next.delete('search')
            else next.set('search', '1')
            setSearchParams(next, { replace: true })
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-accent hover:bg-hover transition focus-ring"
        >
          <Search size={18} />
        </button>
        <Link
          to="/events/new"
          aria-label={t('events.createEvent', 'Создать встречу')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-accent hover:bg-hover transition focus-ring"
        >
          <Plus size={22} strokeWidth={2.2} />
        </Link>
      </>
    )
  }

  if (pathname === '/notifications') {
    return <NotificationsNavbarActions />
  }

  return null
}

export default function Layout({ children, rail, mobileActions }: LayoutProps) {
  const { t } = useTranslation()
  const hasRail = !!rail
  const mobileTitle = useMobileTitle(t)
  const autoMobileActions = useMobileNavbarActions(t)
  const { data: notifications = [] } = useNotifications()
  const unreadNotifications = notifications.filter(n => !n.is_read).length

  return (
    <TooltipProvider delayDuration={250}>
      <div
        className="h-[100dvh] text-ink p-3 flex items-stretch justify-center lg:p-5"
        style={{
          background:
            'radial-gradient(1100px 700px at 12% -12%, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent 58%), ' +
            'radial-gradient(900px 650px at 88% -6%, color-mix(in srgb, var(--color-indigo) 24%, transparent), transparent 55%), ' +
            'radial-gradient(1000px 700px at 100% 108%, color-mix(in srgb, var(--color-purple) 26%, transparent), transparent 58%), ' +
            'radial-gradient(800px 600px at 0% 100%, color-mix(in srgb, var(--color-accent) 16%, transparent), transparent 55%), ' +
            'var(--color-bg-2)',
        }}
      >
        {/* Единая карточка приложения — сайдбар + контент + рейл + bottom-nav как секции.
            Плавает поверх градиента на всех размерах экрана. */}
        <div
          className={cn(
            'w-full h-full min-h-0 flex flex-col',
            'rounded-[20px] border border-line bg-bg overflow-hidden',
            'shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_40px_rgba(0,0,0,0.08)]',
            'lg:flex-row',
          )}
        >
          {/* Sidebar — секция карточки на десктопе */}
          <aside className="hidden lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-line">
            <Sidebar />
          </aside>

          {/* Правая часть карточки: mobile navbar + main/rail + bottom-nav (mobile) */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:overflow-hidden">
            {/* Mobile navbar — bell (notifications) left, title center, action-icons right */}
            <header
              className={cn(
                'lg:hidden shrink-0 h-11 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 px-3',
                'bg-bg border-b border-line',
              )}
            >
              <div className="flex items-center justify-self-start">
                <Link
                  to="/notifications"
                  aria-label={t('nav.notifications', 'Уведомления')}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-accent hover:bg-hover transition focus-ring"
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span
                      className="absolute top-1 right-1 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-danger px-[3px] text-[9px] font-semibold text-white tnum"
                      aria-hidden
                    >
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </Link>
              </div>
              <div className="text-[15px] font-semibold tracking-[-0.015em] text-ink truncate justify-self-center">
                {mobileTitle}
              </div>
              <div className="flex items-center gap-0.5 justify-self-end">
                {mobileActions ?? autoMobileActions}
              </div>
            </header>

            {/* Main + rail */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row lg:overflow-hidden">
              <main className="flex-1 min-w-0 min-h-0 overflow-y-auto px-4 py-6 lg:px-8 lg:py-7">
                {children}
              </main>
              {hasRail && (
                <aside className="hidden xl:flex xl:w-[340px] xl:shrink-0 xl:flex-col xl:overflow-y-auto xl:border-l xl:border-line gap-6 px-6 py-7">
                  {rail}
                </aside>
              )}
            </div>

            <BottomNav />
          </div>
        </div>
      </div>

      <Toaster />
    </TooltipProvider>
  )
}
