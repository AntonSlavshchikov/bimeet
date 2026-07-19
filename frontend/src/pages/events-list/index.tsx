import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, CalendarOff, Plus, SearchX, X } from 'lucide-react'
import { useEvents } from '@/entities/event/queries'
import { useNotifications } from '@/entities/notification/queries'
import { useJoinPublicEvent, useConfirmAttendance } from '@/features/event-manage/model/hooks'
import EventListRow from '@/widgets/event-card/EventListRow'
import type { EventListItem, PublicEventListItem } from '@/entities/event/model/types'
import {
  Button,
  EmptyState,
  ListGroup,
  MiniCalendar,
  PageHeader,
  RailCard,
  RailCardTitle,
  SearchInput,
  SegmentedControl,
  StatCell,
  useToast,
} from '@/shared/ui'
type Tab = 'all' | 'attending' | 'organizing' | 'past'
type EventAny = EventListItem | PublicEventListItem

const VALID_TABS: Tab[] = ['all', 'attending', 'organizing', 'past']

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface Group {
  /** Заголовок секции — «Сегодня · ср, 8 июня» или «Июнь». */
  title: string
  /** Количество встреч выносится вправо, как в Warm Canvas. */
  countLabel: string
  /** Подпись для дней внутри: 'weekday' для внутримесячных, 'month' иначе */
  dateCaption: 'weekday' | 'month'
  events: EventAny[]
}

function groupEvents(
  events: EventAny[],
  locale: string,
  t: ReturnType<typeof useTranslation>['t'],
): Group[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sorted = [...events].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  )

  const todayList: EventAny[] = []
  const byMonth = new Map<string, EventAny[]>()

  for (const e of sorted) {
    const d = new Date(e.date_start)
    if (isSameDay(d, today)) {
      todayList.push(e)
      continue
    }
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push(e)
  }

  const groups: Group[] = []
  if (todayList.length > 0) {
    const dateLabel = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long' }).format(today)
    groups.push({
      title: t('events.todayGroup', { date: dateLabel }),
      countLabel: t('events.eventCount', { count: todayList.length }),
      dateCaption: 'month',
      events: todayList,
    })
  }
  for (const [key, list] of byMonth) {
    const [y, m] = key.split('-').map(Number)
    const monthName = new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(y, m, 1))
    const title = monthName.charAt(0).toUpperCase() + monthName.slice(1)
    const currentYear = new Date().getFullYear()
    const yearPart = y === currentYear ? '' : ` ${y}`
    groups.push({
      title: `${title}${yearPart}`,
      countLabel: t('events.eventCount', { count: list.length }),
      dateCaption: 'weekday',
      events: list,
    })
  }
  return groups
}

function resolveCanAttend(
  event: EventAny,
  myStatus: string | undefined,
  spotsLeft: number | null,
): boolean | undefined {
  if (event.organizer.is_me) return undefined
  if (myStatus === 'confirmed') return undefined
  if (myStatus === 'invited') return true
  if (event.is_public) {
    const isParticipant = (event as PublicEventListItem).is_participant
    if (isParticipant) return undefined
    return spotsLeft == null || spotsLeft > 0
  }
  return undefined
}

function UpcomingRail({ events }: { events: EventAny[] }) {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const today = new Date()
  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU'

  const selectedDate = useMemo(() => {
    const raw = searchParams.get('date')
    if (!raw) return undefined
    const [y, m, d] = raw.split('-').map(Number)
    if (!y || !m || !d) return undefined
    return new Date(y, m - 1, d)
  }, [searchParams])

  const handleSelectDate = (date: Date) => {
    const next = new URLSearchParams(searchParams)
    if (selectedDate && isSameDay(date, selectedDate)) {
      next.delete('date')
    } else {
      next.set('date', isoDay(date))
    }
    setSearchParams(next, { replace: true })
  }

  const activeDay = selectedDate ?? today
  const dayEvents = events.filter(e => isSameDay(new Date(e.date_start), activeDay))
  const nextFew = events
    .filter(e => new Date(e.date_start) > today)
    .slice(0, 3)

  const eventDates = useMemo(
    () => new Set(events.map(e => isoDay(new Date(e.date_start)))),
    [events],
  )

  const upcoming = selectedDate ? dayEvents : (dayEvents.length > 0 ? dayEvents : nextFew)
  return (
    <>
      <RailCard>
        <div className="flex items-center justify-between gap-2">
          <RailCardTitle>
            {selectedDate
              ? t('events.railSelectedDay')
              : dayEvents.length > 0
                ? t('events.railToday')
                : t('events.railUpcoming')}
          </RailCardTitle>
          {selectedDate && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete('date')
                setSearchParams(next, { replace: true })
              }}
              className="text-[11px] font-semibold text-accent transition hover:opacity-75"
            >
              {t('events.railBackToday')}
            </button>
          )}
        </div>
        <div className="text-[44px] font-bold tracking-[-0.03em] leading-none text-ink">
          {activeDay.getDate()}
        </div>
        <div className="text-[13px] text-ink-3 mt-1 mb-3">
          {activeDay.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        {upcoming.length === 0 ? (
          <div className="border-t border-line-soft pt-3 text-[13px] text-ink-3">
            {t('events.emptyNoPlanned', 'Пока ничего не запланировано')}
          </div>
        ) : (
          upcoming.map(e => {
            const time = new Date(e.date_start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
            return (
              <Link
                key={e.id}
                to={`/events/${e.id}`}
                className="border-t border-line-soft pt-2.5 mt-2.5 first:mt-0 flex gap-2.5 items-start group hover:bg-hover -mx-1 px-1 rounded-[6px] transition"
              >
                <div className="text-[12px] font-semibold w-10 text-ink-2 tnum pt-0.5">{time}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-ink truncate group-hover:text-ink">{e.title}</div>
                  {e.location && <div className="text-[12px] text-ink-3 mt-0.5 truncate">{e.location}</div>}
                </div>
              </Link>
            )
          })
        )}
      </RailCard>

      <RailCard>
        <MiniCalendar eventDates={eventDates} selected={selectedDate} onSelect={handleSelectDate} />
      </RailCard>
    </>
  )
}

function StatsRail({
  events,
  unreadCount,
}: {
  events: EventAny[]
  unreadCount: number
}) {
  const { t } = useTranslation()
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const thisMonth = events.filter(e => {
    const d = new Date(e.date_start)
    return d >= monthStart && d <= monthEnd && e.status !== 'completed'
  })
  const organizing = thisMonth.filter(e => e.organizer.is_me).length
  const upcoming = thisMonth.length

  // Уникальные participants в this-month. В приватных событиях дедуплицируем по email,
  // в публичных безопасных DTO email отсутствует, поэтому используем display name.
  const people = new Set<string>()
  thisMonth.forEach(e => {
    e.participants.forEach(p => {
      if (!p.user.is_me) {
        const key = 'email' in p.user && typeof p.user.email === 'string' ? p.user.email : p.user.name
        people.add(key)
      }
    })
  })

  return (
    <RailCard>
      <RailCardTitle>{t('events.railThisMonth')}</RailCardTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatCell value={upcoming} label={t('events.railEventsAhead')} />
        <StatCell value={organizing} label={t('events.railOrganizing')} />
        <StatCell value={people.size} label={t('events.railPeopleNearby')} />
        <StatCell value={unreadCount} label={t('events.railNewReplies')} />
      </div>
    </RailCard>
  )
}

function EventsListPage() {
  const events = useEvents()
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // tab синхронизируется с ?tab=… в URL — кликабельно из Sidebar (фильтры)
  const urlTab = searchParams.get('tab') as Tab | null
  const [tab, setTabState] = useState<Tab>(urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'all')

  useEffect(() => {
    if (urlTab && VALID_TABS.includes(urlTab) && urlTab !== tab) setTabState(urlTab)
    if (!urlTab && tab !== 'all') setTabState('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab])

  function setTab(next: Tab) {
    setTabState(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const [search, setSearch] = useState('')
  const mobileSearchRef = useRef<HTMLInputElement>(null)
  const mobileSearchOpen = searchParams.get('search') === '1'

  function closeMobileSearch() {
    const next = new URLSearchParams(searchParams)
    next.delete('search')
    setSearchParams(next, { replace: true })
    setSearch('')
  }

  const joinPublicEvent = useJoinPublicEvent()
  const confirmAttendance = useConfirmAttendance()

  // «Встречи» — только мои: организатор, приглашён или участвую. Публичные чужие
  // встречи живут в отдельной вкладке «Найти публичные».
  const allUpcoming = useMemo<EventAny[]>(
    () => events.filter(e => e.status !== 'completed'),
    [events],
  )

  const attendingEvents = events.filter(e => !e.organizer.is_me && e.status !== 'completed')
  const organizingEvents = events.filter(e => e.organizer.is_me && e.status !== 'completed')
  const pastEvents = events.filter(e => e.status === 'completed')

  function handleAttend(event: EventAny) {
    const myParticipant = event.participants.find(p => p.user.is_me)
    const myStatus = myParticipant?.status ?? event.my_status

    if (myStatus === 'invited') {
      confirmAttendance.mutate(
        { eventId: event.id },
        {
          onSuccess: () => toast({ title: t('eventCard.statusConfirmed', 'Подтверждено'), status: 'success' }),
          onError: err => toast({ title: t('common.error'), description: err.message, status: 'error' }),
        },
      )
    } else {
      joinPublicEvent.mutate(event.id, {
        onSuccess: () => toast({ title: t('eventInfo.joinSuccess', 'Вы присоединились'), status: 'success' }),
        onError: err => toast({ title: t('common.error'), description: err.message, status: 'error' }),
      })
    }
  }

  function filterBySearch(list: EventAny[]): EventAny[] {
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q)
    )
  }

  const sourceForTab: Record<Tab, EventAny[]> = {
    all: allUpcoming,
    attending: attendingEvents,
    organizing: organizingEvents,
    past: pastEvents,
  }

  const selectedDate = searchParams.get('date')
  const visible: EventAny[] = filterBySearch(sourceForTab[tab]).filter(event =>
    !selectedDate || isoDay(new Date(event.date_start)) === selectedDate,
  )
  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU'
  const groups = groupEvents(visible, locale, t)
  const hasSearch = search.trim().length > 0
  const isEmpty = visible.length === 0

  const todayLine = (() => {
    const todayCount = allUpcoming.filter(e => isSameDay(new Date(e.date_start), new Date())).length
    const upcomingLabel = t('events.upcomingCount', { count: allUpcoming.length })
    if (todayCount === 0) return upcomingLabel
    return `${upcomingLabel} · ${t('events.todayCount', { count: todayCount })}`
  })()

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar — DESKTOP only. На mobile «+» переехал в navbar, поиск — компактный icon-toggle ниже. */}
      <div className="hidden min-[761px]:flex items-center gap-2.5">
        <SearchInput
          className="min-w-0 flex-1"
          kbdHint="⌘K"
          placeholder={t('events.searchPlaceholder', 'Найти встречу, место...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button variant="icon" size="icon" asChild>
            <Link to="/notifications" aria-label={t('nav.notifications')}>
              <Bell size={15} />
            </Link>
          </Button>
          <Button asChild>
            <Link to="/events/new">
              <Plus size={14} strokeWidth={2.4} />
              {t('events.createEvent', 'Создать встречу')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile search bar — collapsible */}
      {mobileSearchOpen && (
        <div className="min-[761px]:hidden flex items-center gap-2">
          <SearchInput
            ref={mobileSearchRef}
            className="flex-1"
            placeholder={t('events.searchPlaceholder', 'Найти встречу, место...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <Button
            variant="icon"
            size="icon"
            aria-label={t('common.cancel', 'Закрыть')}
            onClick={closeMobileSearch}
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {/* Заголовок и фильтры образуют один блок, как в макете Warm Canvas. */}
      <PageHeader
        title={t('nav.events')}
        subtitle={todayLine}
        filters={(
          <div className="w-full min-[761px]:w-auto">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            fullWidth
            className="min-[761px]:w-auto"
            options={[
              { value: 'all',        label: t('events.tabAll') },
              { value: 'attending',  label: t('events.tabAttending') },
              { value: 'organizing', label: t('events.tabOrganizing') },
              { value: 'past',       label: t('events.tabPast') },
            ]}
          />
          </div>
        )}
      />

      {selectedDate && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[12.5px] font-medium text-accent">
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long' })}
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete('date')
                setSearchParams(next, { replace: true })
              }}
              aria-label={t('events.dateFilterClear')}
              className="transition hover:opacity-70"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      {isEmpty ? (
        hasSearch ? (
          <EmptyState
            icon={SearchX}
            title={t('events.emptySearchResult', { query: search, defaultValue: `Ничего не найдено по запросу «${search}»` })}
          />
        ) : (
          <EmptyState
            icon={CalendarOff}
            title={t('events.emptyNoPlanned', 'Пока ничего не запланировано')}
            action={<Button asChild size="sm"><Link to="/events/new"><Plus size={14} />{t('events.emptyCreateButton', 'Создать встречу')}</Link></Button>}
          />
        )
      ) : (
        <div className="flex flex-col gap-[22px]">
          {groups.map(g => {
            return (
              <section key={g.title} className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-[3px]">
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
                    {g.title}
                  </div>
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
                    {g.countLabel}
                  </div>
                </div>
                <ListGroup>
                  {g.events.map(event => {
                    const myParticipant = event.participants.find(p => p.user.is_me)
                    const myStatus =
                      !event.organizer.is_me
                        ? (myParticipant?.status ?? event.my_status)
                        : undefined
                    const spotsLeft = event.max_guests != null ? event.max_guests - event.confirmed_count : null
                    const canAttend = resolveCanAttend(event, myStatus, spotsLeft)
                    return (
                      <EventListRow
                        key={event.id}
                        event={event}
                        myStatus={myStatus}
                        canJoin={canAttend}
                        onJoin={canAttend ? () => handleAttend(event) : undefined}
                        dateCaption={g.dateCaption}
                      />
                    )
                  })}
                </ListGroup>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

EventsListPage.displayName = 'EventsListPage'

export default EventsListPage

// Reusable Rail composition for this page — exposed for Router
export function EventsListRail() {
  const events = useEvents()
  const { data: notifications = [] } = useNotifications()

  // Рейл «Сегодня/Ближайшие» и мини-календарь — по моим встречам.
  const allEvents = useMemo<EventAny[]>(() => events, [events])

  return (
    <>
      <UpcomingRail events={allEvents} />
      <StatsRail events={allEvents} unreadCount={notifications.filter(notification => !notification.is_read).length} />
    </>
  )
}
