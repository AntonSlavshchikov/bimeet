import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Compass, SearchX } from 'lucide-react'
import { usePublicEvents } from '@/entities/event/queries'
import { useJoinPublicEvent } from '@/features/event-manage/model/hooks'
import {
  buildPublicEventList,
  type RankedPublicEvent,
} from '@/features/user-location/model/rankPublicEvents'
import { useUserLocation } from '@/features/user-location/model/useUserLocation'
import EventListRow from '@/widgets/event-card/EventListRow'
import type { PublicEventListItem } from '@/entities/event/model/types'
import { EmptyState, ListGroup, PageHeader, SearchInput, useToast } from '@/shared/ui'

// PublicEventsPage — самостоятельный экран «Найти публичные»: каталог
// будущих публичных встреч для всех авторизованных пользователей.
export default function PublicEventsPage() {
  const publicEvents = usePublicEvents()
  const { t } = useTranslation()
  const toast = useToast()
  const joinPublicEvent = useJoinPublicEvent()
  const { position } = useUserLocation()
  const [search, setSearch] = useState('')

  const eventList = useMemo(
    () => buildPublicEventList(publicEvents, position),
    [position, publicEvents],
  )

  const visibleList = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return eventList
    const matches = ({ event }: RankedPublicEvent) =>
      event.title.toLowerCase().includes(q) || event.location.toLowerCase().includes(q)
    if (eventList.mode === 'fallback') {
      return { ...eventList, all: eventList.all.filter(matches) }
    }
    return {
      ...eventList,
      nearby: eventList.nearby.filter(matches),
      other: eventList.other.filter(matches),
    }
  }, [eventList, search])

  const totalCount = eventList.mode === 'fallback'
    ? eventList.all.length
    : eventList.nearby.length + eventList.other.length
  const visibleCount = visibleList.mode === 'fallback'
    ? visibleList.all.length
    : visibleList.nearby.length + visibleList.other.length

  function handleJoin(event: PublicEventListItem) {
    joinPublicEvent.mutate(event.id, {
      onSuccess: () => toast({ title: t('eventInfo.joinSuccess', 'Вы присоединились'), status: 'success' }),
      onError: err => toast({ title: t('common.error'), description: err.message, status: 'error' }),
    })
  }

  function renderEvent({ event, distanceKm }: RankedPublicEvent) {
    const spotsLeft = event.max_guests != null ? event.max_guests - event.confirmed_count : null
    const canRequestJoin =
      !event.organizer.is_me &&
      !event.is_participant &&
      event.status === 'active'
    const canJoin = canRequestJoin ? spotsLeft == null || spotsLeft > 0 : undefined
    return (
      <EventListRow
        key={event.id}
        event={event}
        myStatus={event.my_status}
        canJoin={canJoin}
        onJoin={canJoin ? () => handleJoin(event) : undefined}
        dateCaption="month"
        distanceKm={distanceKm}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Head */}
      <PageHeader title={t('nav.publicEvents')} subtitle={t('publicEvents.subtitle', { count: totalCount })} />

      <SearchInput
        className="max-w-[420px]"
        placeholder={t('events.searchPlaceholder', 'Найти встречу, место...')}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {visibleCount === 0 ? (
        <EmptyState
          icon={search.trim() ? SearchX : Compass}
          title={search.trim()
            ? t('events.emptySearchResult', { query: search, defaultValue: `Ничего не найдено по запросу «${search}»` })
            : t('publicEvents.empty')}
        />
      ) : (
        visibleList.mode === 'fallback' ? (
          <ListGroup>{visibleList.all.map(renderEvent)}</ListGroup>
        ) : (
          <div className="flex flex-col gap-[22px]">
            {visibleList.nearby.length > 0 && (
              <PublicEventSection
                title={t('publicEvents.nearbyTitle')}
                meta={t('publicEvents.nearbyMeta', {
                  count: visibleList.nearby.length,
                  radius: visibleList.radiusKm,
                })}
              >
                {visibleList.nearby.map(renderEvent)}
              </PublicEventSection>
            )}
            {visibleList.other.length > 0 && (
              <PublicEventSection
                title={t('publicEvents.otherTitle')}
                meta={t('publicEvents.sectionCount', { count: visibleList.other.length })}
              >
                {visibleList.other.map(renderEvent)}
              </PublicEventSection>
            )}
          </div>
        )
      )}
    </div>
  )
}

function PublicEventSection({
  title,
  meta,
  children,
}: {
  title: string
  meta: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-[3px]">
        <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
          {title}
        </div>
        <div className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
          {meta}
        </div>
      </div>
      <ListGroup>{children}</ListGroup>
    </section>
  )
}
