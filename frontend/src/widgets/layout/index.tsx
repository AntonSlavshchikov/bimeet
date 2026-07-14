import { type ReactNode } from 'react'
import { Calendar as CalendarIcon, Plus, Search } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import NotificationsNavbarActions from '@/features/notifications/ui/NotificationsNavbarActions'
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

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen warm-canvas-bg text-ink">
        {/* Fixed sidebar — десктоп. Всегда на одной позиции независимо от content. */}
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 w-[220px] flex-col overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Content area — отступ слева под fixed sidebar */}
        <div className="lg:pl-[220px] flex flex-col min-h-screen">
          {/* Mobile navbar — Calendar icon left, title center, action-icons right (как в макете 05-app.html) */}
          <header
            className={cn(
              'lg:hidden sticky top-0 z-20 h-11 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 px-3',
              'bg-surface/[0.78] backdrop-blur-xl backdrop-saturate-150 border-b border-line',
            )}
          >
            <div className="flex items-center justify-self-start">
              <Link
                to="/events"
                aria-label={t('nav.events', 'Мои встречи')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-accent hover:bg-hover transition focus-ring"
              >
                <CalendarIcon size={20} />
              </Link>
            </div>
            <div className="text-[15px] font-semibold tracking-[-0.015em] text-ink truncate justify-self-center">
              {mobileTitle}
            </div>
            <div className="flex items-center gap-0.5 justify-self-end">
              {mobileActions ?? autoMobileActions}
            </div>
          </header>

          {/* Оболочка занимает всю ширину после sidebar, чтобы при уменьшении
              масштаба браузера layout не оставался маленьким блоком слева.
              Сам контент сохраняет читаемую ширину и центрируется, а rail
              остаётся у правого края viewport. */}
          <div
            className={cn(
              'flex-1 min-w-0 w-full grid grid-cols-1',
              hasRail && 'xl:grid-cols-[minmax(0,1fr)_276px]',
            )}
          >
            <main className="relative min-w-0 px-4 py-6 lg:px-8 lg:py-7 pb-[80px] lg:pb-12">
              <div className={cn('mx-auto w-full', hasRail ? 'max-w-[944px]' : 'max-w-[1220px]')}>
                {children}
              </div>
            </main>
            {hasRail && (
              <aside className="hidden xl:flex sticky top-0 h-screen overflow-y-auto border-l border-line bg-[color-mix(in_srgb,var(--color-surface)_91%,var(--color-bg))] flex-col gap-3 px-5 py-[25px]">
                {rail}
              </aside>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
      <Toaster />
    </TooltipProvider>
  )
}
