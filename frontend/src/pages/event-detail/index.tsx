import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  Download,
  History,
  MessageCircle,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { useEvent } from '@/entities/event/queries'
import { useCompleteEvent } from '@/features/event-manage/model/hooks'
import ParticipantsTab from '@/features/participants/ui/ParticipantsTab'
import CollectionsTab from '@/features/collections/ui/CollectionsTab'
import PollsTab from '@/features/polls/ui/PollsTab'
import ItemsTab from '@/features/items/ui/ItemsTab'
import CarpoolTab from '@/features/carpools/ui/CarpoolTab'
import ChatTab from '@/features/chat/ui/ChatTab'
import { useChatUnread } from '@/features/chat/model/hooks'
import EventInfoPanel from '@/widgets/event-detail/EventInfoPanel'
import { formatDate, formatDateTime } from '@/shared/lib/formatDate'
import { resolveEventTab, withEventTab, type EventTabKey } from './tab-url'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EventSectionDataRow,
  EventSectionHeader,
  EventSectionList,
  EventSectionNav,
  EventSectionStat,
  EventSectionStats,
} from '@/shared/ui'

interface TabDef {
  key: EventTabKey
  tKey: string
  fallback: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const ORDINARY_TABS: TabDef[] = [
  { key: 'participants', tKey: 'tabs.participants', fallback: 'Участники',   icon: Users },
  { key: 'collections',  tKey: 'tabs.collections',  fallback: 'Сборы',       icon: Wallet },
  { key: 'polls',        tKey: 'tabs.polls',        fallback: 'Опросы',      icon: BarChart3 },
  { key: 'items',        tKey: 'tabs.items',        fallback: 'Вещи',        icon: ShoppingBag },
  { key: 'carpools',     tKey: 'tabs.carpools',     fallback: 'Попутчики',   icon: Truck },
]

const CHAT_TAB: TabDef = { key: 'chat', tKey: 'tabs.chat', fallback: 'Чат', icon: MessageCircle }

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const event = useEvent(id!)
  const { t, i18n } = useTranslation()
  const [completeOpen, setCompleteOpen] = useState(false)
  const tabParam = searchParams.get('tab')

  function selectTab(next: EventTabKey) {
    setSearchParams(withEventTab(searchParams, next), { replace: true })
  }

  const completeEvent = useCompleteEvent(id ?? '')
  // Chat is members-only: the organizer or anyone already on the participant list.
  const isMember =
    !!event &&
    (event.organizer.is_me || event.participants.some(p => p.user.is_me))
  const { data: chatUnread = 0 } = useChatUnread(id ?? '', isMember)

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-ink-3 mb-4">{t('events.notFound', 'Встреча не найдена')}</p>
        <Button asChild>
          <Link to="/events">{t('common.backToList', 'К списку')}</Link>
        </Button>
      </div>
    )
  }

  const isOrganizer = event.organizer.is_me

  // Chat tab only for members; history only when there are changes.
  const baseTabs: TabDef[] = isMember ? [...ORDINARY_TABS, CHAT_TAB] : ORDINARY_TABS
  const allTabs: TabDef[] =
    event.change_log.length > 0
      ? [...baseTabs, { key: 'changelog', tKey: 'tabs.history', fallback: 'История', icon: History }]
      : baseTabs

  // Фолбэк: если активный таб не входит в набор, переключаемся на первый
  const activeTab = resolveEventTab(tabParam, allTabs.map(td => td.key))
  const todayKey = new Date().toDateString()
  const changesToday = event.change_log.filter(log => new Date(log.changed_at).toDateString() === todayKey).length
  const peopleCount = event.participants.some(participant => participant.is_organizer)
    ? event.participants.length
    : event.participants.length + 1
  const eventForExport = event

  function exportHistory() {
    const rows = eventForExport.change_log.map(log => ({
      changedAt: log.changed_at,
      changedBy: log.changed_by.name,
      field: log.field_name,
      oldValue: log.old_value,
      newValue: log.new_value,
    }))
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `event-${eventForExport.id}-history.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function formatHistoryDate(value: string) {
    const date = new Date(value)
    if (date.toDateString() !== todayKey) return formatDateTime(value)
    const time = new Intl.DateTimeFormat(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
    return `${t('eventInfo.historyToday')}, ${time}`
  }

  return (
    <>
      <div className="flex flex-col gap-5">

        <div className="flex items-center gap-1 text-[12px] font-semibold text-ink-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/events"><ChevronLeft size={14} />{t('eventInfo.backAllEvents', 'Ко всем встречам')}</Link>
          </Button>
          <span aria-hidden>·</span>
          <span>{formatDate(event.date_start)}</span>
        </div>

        <EventInfoPanel event={event} isOrganizer={isOrganizer} />

        <EventSectionNav
          value={activeTab}
          onChange={selectTab}
          label={t('eventInfo.sections', 'Разделы встречи')}
          description={t('eventInfo.sectionsDescription')}
          options={allTabs.map(td => ({
            key: td.key,
            label: td.key === 'participants' ? t('eventInfo.peopleTab') : t(td.tKey, td.fallback),
            icon: td.icon,
            badge: td.key === 'chat' ? chatUnread : undefined,
            count:
              td.key === 'participants' ? peopleCount
              : td.key === 'collections' ? event.collections.length
              : td.key === 'polls' ? event.polls.length
              : td.key === 'items' ? event.items.length
              : td.key === 'carpools' ? event.carpools.length
              : undefined,
          }))}
          action={isOrganizer && event.status === 'active' ? (
            <Button variant="outline" size="sm" onClick={() => setCompleteOpen(true)}>
              <CheckCircle2 size={13} />
              {t('eventInfo.menuComplete', 'Завершить')}
            </Button>
          ) : undefined}
        >
          <div>
            {activeTab === 'participants' && <ParticipantsTab event={event} />}
            {activeTab === 'collections' && <CollectionsTab event={event} />}
            {activeTab === 'polls' && <PollsTab event={event} />}
            {activeTab === 'items' && <ItemsTab event={event} />}
            {activeTab === 'carpools' && <CarpoolTab event={event} />}
            {activeTab === 'chat' && <ChatTab event={event} />}
            {activeTab === 'changelog' && (
              <div>
                <EventSectionHeader
                  kicker={t('eventInfo.historyKicker')}
                  title={t('tabs.history')}
                  description={t('eventInfo.historyDescription')}
                  action={(
                    <Button size="md" onClick={exportHistory}>
                      <Download size={14} /> {t('eventInfo.historyExport')}
                    </Button>
                  )}
                />
                <EventSectionStats>
                  <EventSectionStat label={t('eventInfo.historyEvents')} value={event.change_log.length} />
                  <EventSectionStat label={t('eventInfo.historyToday')} value={changesToday} />
                  <EventSectionStat label={t('eventInfo.historyCreated')} value={formatDate(event.created_at)} />
                </EventSectionStats>
                <EventSectionList>
                  {[...event.change_log].reverse().map(log => (
                    <EventSectionDataRow
                      key={log.id}
                      avatar={log.changed_by.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(part => part[0])
                        .join('')
                        .toUpperCase()}
                      name={log.changed_by.name}
                      note={t('eventInfo.historyChanged', { field: log.field_name })}
                      status={formatHistoryDate(log.changed_at)}
                    />
                  ))}
                </EventSectionList>
              </div>
            )}
          </div>
        </EventSectionNav>
      </div>

      {/* Complete dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('eventInfo.completeDialogTitle', 'Завершить встречу?')}</DialogTitle>
            <DialogDescription>
              {t('eventInfo.completeDialogBody', 'Завершённую встречу нельзя будет редактировать. Участники получат уведомление.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleteOpen(false)}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button
              onClick={() => completeEvent.mutate(undefined, { onSuccess: () => setCompleteOpen(false) })}
              disabled={completeEvent.isPending}
            >
              {t('eventInfo.completeDialogConfirm', 'Завершить')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
