import { type ReactNode } from 'react'
import { BarChart3, Calendar as CalendarIcon, Compass, Plus, Search } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import NotificationsNavbarActions from '@/features/notifications/ui/NotificationsNavbarActions'
import { Toaster } from '@/shared/ui/toast'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/features/auth/model/AuthContext'
import { isAdmin } from '@/features/auth/lib/isAdmin'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

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
  const { user } = useAuth()
  const hasRail = !!rail
  const mobileTitle = useMobileTitle(t)
  const autoMobileActions = useMobileNavbarActions(t)

  return (
    <TooltipProvider delayDuration={250}>
      <div className="warm-canvas-bg flex h-[100dvh] items-stretch justify-center p-2 text-ink max-[420px]:p-[6px] min-[761px]:p-3 min-[1081px]:p-5">
        {/* Единая карточка приложения — сайдбар + контент + рейл + bottom-nav как секции.
            Плавает поверх градиента на всех размерах экрана. */}
        <div
          className={cn(
            'app-shell-shadow h-full min-h-0 w-full max-w-[1320px] overflow-hidden rounded-[30px] border border-line bg-surface',
            'flex flex-col max-[420px]:rounded-[27px] min-[761px]:grid min-[761px]:grid-cols-[200px_minmax(0,1fr)]',
            'min-[1081px]:grid-cols-[220px_minmax(0,1fr)]',
            hasRail && 'min-[1081px]:grid-cols-[220px_minmax(0,1fr)_276px]',
          )}
        >
          {/* Sidebar — секция карточки на десктопе */}
          <aside className="hidden min-[761px]:flex min-[761px]:min-h-0 min-[761px]:flex-col min-[761px]:overflow-y-auto min-[761px]:border-r min-[761px]:border-line">
            <Sidebar />
          </aside>

          {/* Правая часть карточки: mobile navbar + main/rail + bottom-nav (mobile) */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col min-[761px]:overflow-hidden">
            {/* Mobile navbar — Calendar icon left, title center, action-icons right */}
            <header
              className={cn(
                'grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1.5 border-b border-line px-3 min-[761px]:hidden',
                'bg-surface/90 backdrop-blur-md',
              )}
            >
              <div className="flex items-center justify-self-start">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={t('layout.moreNavigation', 'Меню навигации')} className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-[10px] brand-gradient">
                      <img src="/logo-mark.svg" alt="" className="h-6 w-6" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>{t('layout.navigation', 'Навигация')}</DropdownMenuLabel>
                    <DropdownMenuItem asChild><Link to="/events"><CalendarIcon size={14} />{t('nav.events')}</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/discover"><Compass size={14} />{t('nav.publicEvents')}</Link></DropdownMenuItem>
                    {isAdmin(user) && <DropdownMenuItem asChild><Link to="/admin"><BarChart3 size={14} />{t('nav.admin')}</Link></DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="text-[15px] font-semibold tracking-[-0.015em] text-ink truncate justify-self-center">
                {mobileTitle}
              </div>
              <div className="flex items-center gap-0.5 justify-self-end">
                {mobileActions ?? autoMobileActions}
              </div>
            </header>

            {/* Main + rail */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-[14px] pb-[86px] pt-5 max-[420px]:px-[10px] min-[761px]:px-[26px] min-[761px]:pb-9 min-[761px]:pt-[25px]">
                {children}
              </main>
            </div>

            <BottomNav />
          </div>
          {hasRail && (
            <aside className="hidden min-[1081px]:flex min-[1081px]:min-h-0 min-[1081px]:flex-col min-[1081px]:gap-5 min-[1081px]:overflow-y-auto min-[1081px]:border-l min-[1081px]:border-line min-[1081px]:px-5 min-[1081px]:py-[25px]">
              {rail}
            </aside>
          )}
        </div>
      </div>

      <Toaster />
    </TooltipProvider>
  )
}
