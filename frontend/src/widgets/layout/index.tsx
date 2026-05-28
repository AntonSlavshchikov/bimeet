import { type ReactNode } from 'react'
import { Calendar as CalendarIcon, Plus, Search } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
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
  if (pathname === '/events') return t('nav.events', 'Встречи')
  if (pathname === '/events/new') return t('eventForm.titleCreate', 'Новая встреча')
  if (pathname.startsWith('/events/') && pathname.endsWith('/edit')) return t('eventForm.titleEdit', 'Редактирование')
  if (pathname.startsWith('/events/')) return t('events.title', 'Встреча')
  if (pathname === '/profile') return t('nav.profile', 'Профиль')
  if (pathname === '/admin') return t('nav.admin', 'Админка')
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
  return null
}

export default function Layout({ children, rail, mobileActions }: LayoutProps) {
  const { t } = useTranslation()
  const hasRail = !!rail
  const mobileTitle = useMobileTitle(t)
  const autoMobileActions = useMobileNavbarActions(t)

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-bg text-ink">
        {/* Fixed sidebar — десктоп. Всегда на одной позиции независимо от content. */}
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 w-[260px] flex-col overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Content area — отступ слева под fixed sidebar */}
        <div className="lg:pl-[260px] flex flex-col min-h-screen">
          {/* Mobile navbar — Calendar icon left, title center, action-icons right (как в макете 05-app.html) */}
          <header
            className={cn(
              'lg:hidden sticky top-0 z-20 h-11 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 px-3',
              'bg-bg/80 backdrop-blur-xl backdrop-saturate-150 border-b border-line',
            )}
          >
            <div className="flex items-center justify-self-start">
              <Link
                to="/events"
                aria-label={t('nav.events', 'Встречи')}
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

          {/* Контейнер всегда max-w 1220, начинается сразу после sidebar.
              С rail: main 880 + rail 340.
              Без rail: main растягивается на весь 1220 — заполняет пространство rail. */}
          <div
            className={cn(
              'flex-1 min-w-0 w-full grid grid-cols-1 mr-auto ml-0 max-w-[1220px]',
              hasRail && 'xl:grid-cols-[minmax(0,1fr)_340px]',
            )}
          >
            <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-7 pb-[80px] lg:pb-12">
              {children}
            </main>
            {hasRail && (
              <aside className="hidden xl:flex sticky top-0 h-screen overflow-y-auto border-l border-line bg-bg flex-col gap-6 px-6 py-7">
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
