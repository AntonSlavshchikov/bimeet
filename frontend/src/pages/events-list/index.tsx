import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarOff, Plus, SearchX, X } from 'lucide-react'
import { useEvents } from '@/entities/event/queries'
import { useJoinPublicEvent, useConfirmAttendance } from '@/features/event-manage/model/hooks'
import EventListRow from '@/widgets/event-card/EventListRow'
import type { EventListItem, PublicEventListItem } from '@/entities/event/model/types'
import {
  Button,
  ListGroup,
  MiniCalendar,
  RailCard,
  RailCardTitle,
  SearchInput,
  SegmentedControl,
  StatCell,
  useToast,
} from '@/shared/ui'
type Tab = 'all' | 'attending' | 'organizing' | 'public' | 'past'
type EventAny = EventListItem | PublicEventListItem

const VALID_TABS: Tab[] = ['all', 'attending', 'organizing', 'public', 'past']

const MONTHS_LONG_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface Group {
  /** Заголовок секции — «Сегодня · ср, 8 июня» или «Июнь · 5 встреч» */
  title: string
  /** Подпись для дней внутри: 'weekday' для внутримесячных, 'month' иначе */
  dateCaption: 'weekday' | 'month'
  events: EventAny[]
}

function groupEvents(events: EventAny[]): Group[] {
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
    const wd = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][today.getDay()]
    groups.push({
      title: `Сегодня · ${wd}, ${today.getDate()} ${MONTHS_LONG_RU[today.getMonth()].toLowerCase()}`,
      dateCaption: 'weekday',
      events: todayList,
    })
  }
  for (const [key, list] of byMonth) {
    const [y, m] = key.split('-').map(Number)
    const monthName = MONTHS_LONG_RU[m]
    const currentYear = new Date().getFullYear()
    const yearPart = y === currentYear ? '' : ` ${y}`
    groups.push({
      title: `${monthName}${yearPart} · ${list.length} ${pluralEvents(list.length)}`,
      dateCaption: 'weekday',
      events: list,
    })
  }
  return groups
}

function pluralEvents(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m100 >= 11 && m100 <= 14) return 'встреч'
  if (m10 === 1) return 'встреча'
  if (m10 >= 2 && m10 <= 4) return 'встречи'
  return 'встреч'
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

function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  action?: { to: string; label: string }
}) {
  return (
    <div className="rounded-[12px] border border-line bg-surface py-14 px-4 flex flex-col items-center gap-3">
      <Icon size={28} className="text-ink-3" />
      <div className="text-[13.5px] text-ink-3">{title}</div>
      {action && (
        <Button asChild size="sm" className="mt-1">
          <Link to={action.to}><Plus size={14} /> {action.label}</Link>
        </Button>
      )}
    </div>
  )
}

function UpcomingRail({ events }: { events: EventAny[] }) {
  const { t } = useTranslation()
  const today = new Date()
  const todayEvents = events.filter(e => isSameDay(new Date(e.date_start), today))
  const nextFew = events
    .filter(e => new Date(e.date_start) > today)
    .slice(0, 3)

  const eventDates = useMemo(
    () => new Set(events.map(e => isoDay(new Date(e.date_start)))),
    [events],
  )

  const upcoming = todayEvents.length > 0 ? todayEvents : nextFew

  return (
    <>
      <RailCard>
        <RailCardTitle>{todayEvents.length > 0 ? 'Сегодня' : 'Ближайшие'}</RailCardTitle>
        <div className="text-[44px] font-bold tracking-[-0.03em] leading-none text-ink">
          {today.getDate()}
        </div>
        <div className="text-[13px] text-ink-3 mt-1 mb-3">
          {today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        {upcoming.length === 0 ? (
          <div className="border-t border-line-soft pt-3 text-[13px] text-ink-3">
            {t('events.emptyNoOrganized', 'Пока ничего не запланировано')}
          </div>
        ) : (
          upcoming.map(e => {
            const time = new Date(e.date_start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
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
        <MiniCalendar eventDates={eventDates} />
      </RailCard>
    </>
  )
}

function StatsRail({
  events,
}: {
  events: EventAny[]
}) {
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
      <RailCardTitle>Этот месяц</RailCardTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatCell value={upcoming} label="встреч впереди" />
        <StatCell value={organizing} label="организуете" />
        <StatCell value={people.size} label="человек рядом" />
        <StatCell value="—" label="сборов" />
      </div>
    </RailCard>
  )
}

function EventsListPage() {
  const events = useEvents()
  const { t } = useTranslation()
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
  // «Публичные» внутри моих встреч = мои публичные (например, которые я организовал).
  const myPublicEvents = events.filter(e => e.is_public && e.status !== 'completed')
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
    public: myPublicEvents,
    past: pastEvents,
  }

  const visible: EventAny[] = filterBySearch(sourceForTab[tab])
  const groups = groupEvents(visible)
  const hasSearch = search.trim().length > 0
  const isEmpty = visible.length === 0

  const todayLine = (() => {
    const todayCount = allUpcoming.filter(e => isSameDay(new Date(e.date_start), new Date())).length
    if (todayCount === 0) return `${allUpcoming.length} ${pluralEvents(allUpcoming.length)} впереди`
    return `${allUpcoming.length} ${pluralEvents(allUpcoming.length)} впереди · ${todayCount} ${pluralEvents(todayCount)} сегодня`
  })()

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar — DESKTOP only. На mobile «+» переехал в navbar, поиск — компактный icon-toggle ниже. */}
      <div className="hidden lg:grid gap-4 items-center grid-cols-[minmax(0,1fr)_auto]">
        <SearchInput
          className="max-w-[420px]"
          kbdHint="⌘K"
          placeholder={t('events.searchPlaceholder', 'Найти встречу, место...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2 justify-self-end">
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
        <div className="lg:hidden flex items-center gap-2">
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

      {/* Page head — крупнее на mobile (iOS large title 34px) */}
      <div>
        <h1 className="text-[34px] lg:text-[28px] font-bold tracking-[-0.022em] leading-[1.05] lg:leading-[1.15]">
          {t('events.title', 'Встречи')}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-3 font-medium">{todayLine}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all',        label: t('events.tabAll', 'Все'),             count: allUpcoming.length },
            { value: 'attending',  label: t('events.tabAttending', 'Участвую'),   count: attendingEvents.length },
            { value: 'organizing', label: t('events.tabOrganizing', 'Организую'), count: organizingEvents.length },
            { value: 'public',     label: t('events.tabPublic', 'Публичные'),     count: myPublicEvents.length },
            { value: 'past',       label: t('events.tabPast', 'Прошедшие'),       count: pastEvents.length },
          ]}
        />
      </div>

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
            title={t('events.emptyNoOrganized', 'Пока ничего не запланировано')}
            action={{ to: '/events/new', label: t('events.emptyCreateButton', 'Создать встречу') }}
          />
        )
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(g => {
            return (
              <section key={g.title} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                    {g.title}
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

  // Рейл «Сегодня/Ближайшие» и мини-календарь — по моим встречам.
  const allEvents = useMemo<EventAny[]>(() => events, [events])

  return (
    <>
      <UpcomingRail events={allEvents} />
      <StatsRail events={allEvents} />
    </>
  )
}
