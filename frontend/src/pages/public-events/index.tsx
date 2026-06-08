import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Compass, SearchX } from 'lucide-react'
import { usePublicEvents } from '@/entities/event/queries'
import { useJoinPublicEvent } from '@/features/event-manage/model/hooks'
import EventListRow from '@/widgets/event-card/EventListRow'
import type { PublicEventListItem } from '@/entities/event/model/types'
import { ListGroup, SearchInput, useToast } from '@/shared/ui'

// PublicEventsPage — самостоятельный экран «Найти публичные»: просто список
// будущих публичных встреч, в которых пользователь не участвует и не организатор
// (бэкенд уже исключает их в ListPublic). Без вкладок-фильтров.
export default function PublicEventsPage() {
  const publicEvents = usePublicEvents()
  const { t } = useTranslation()
  const toast = useToast()
  const joinPublicEvent = useJoinPublicEvent()
  const [search, setSearch] = useState('')

  const upcoming = useMemo<PublicEventListItem[]>(() => {
    const now = new Date().getTime()
    return publicEvents
      .filter(e => e.status !== 'completed' && new Date(e.date_end).getTime() >= now)
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
  }, [publicEvents])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return upcoming
    return upcoming.filter(e => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q))
  }, [upcoming, search])

  function handleJoin(event: PublicEventListItem) {
    joinPublicEvent.mutate(event.id, {
      onSuccess: () => toast({ title: t('eventInfo.joinSuccess', 'Вы присоединились'), status: 'success' }),
      onError: err => toast({ title: t('common.error'), description: err.message, status: 'error' }),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Head */}
      <div>
        <h1 className="text-[34px] lg:text-[28px] font-bold tracking-[-0.022em] leading-[1.05] lg:leading-[1.15]">
          {t('nav.publicEvents', 'Найти публичные')}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-3 font-medium">
          {t('publicEvents.subtitle', { count: upcoming.length, defaultValue: `${upcoming.length} публичных встреч поблизости` })}
        </p>
      </div>

      <SearchInput
        className="max-w-[420px]"
        placeholder={t('events.searchPlaceholder', 'Найти встречу, место...')}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {visible.length === 0 ? (
        <div className="rounded-[12px] border border-line bg-surface py-14 px-4 flex flex-col items-center gap-3">
          {search.trim() ? (
            <>
              <SearchX size={28} className="text-ink-3" />
              <div className="text-[13.5px] text-ink-3">
                {t('events.emptySearchResult', { query: search, defaultValue: `Ничего не найдено по запросу «${search}»` })}
              </div>
            </>
          ) : (
            <>
              <Compass size={28} className="text-ink-3" />
              <div className="text-[13.5px] text-ink-3">
                {t('publicEvents.empty', 'Сейчас нет публичных встреч, к которым можно присоединиться')}
              </div>
            </>
          )}
        </div>
      ) : (
        <ListGroup>
          {visible.map(event => {
            const spotsLeft = event.max_guests != null ? event.max_guests - event.confirmed_count : null
            const canJoin = spotsLeft == null || spotsLeft > 0
            return (
              <EventListRow
                key={event.id}
                event={event}
                canJoin={canJoin}
                onJoin={canJoin ? () => handleJoin(event) : undefined}
                dateCaption="month"
              />
            )
          })}
        </ListGroup>
      )}
    </div>
  )
}
