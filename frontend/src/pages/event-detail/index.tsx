import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  History,
  MessageCircle,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { useEvent } from '@/entities/event/queries'
import type { Event } from '@/entities/event/model/types'
import { useCompleteEvent } from '@/features/event-manage/model/hooks'
import ParticipantsTab from '@/features/participants/ui/ParticipantsTab'
import CollectionsTab from '@/features/collections/ui/CollectionsTab'
import PollsTab from '@/features/polls/ui/PollsTab'
import ItemsTab from '@/features/items/ui/ItemsTab'
import CarpoolTab from '@/features/carpools/ui/CarpoolTab'
import ChatTab from '@/features/chat/ui/ChatTab'
import { useChatUnread } from '@/features/chat/model/hooks'
import EventInfoPanel from '@/widgets/event-detail/EventInfoPanel'
import { formatDateTime } from '@/shared/lib/formatDate'
import { cn } from '@/shared/lib/cn'
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'

type TabKey = 'participants' | 'collections' | 'polls' | 'items' | 'carpools' | 'chat' | 'changelog'

interface TabDef {
  key: TabKey
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
  const [searchParams] = useSearchParams()
  const event = useEvent(id!)
  const { t } = useTranslation()
  const [completeOpen, setCompleteOpen] = useState(false)
  const tabParam = searchParams.get('tab') as TabKey | null
  const [tab, setTab] = useState<TabKey>(tabParam ?? 'participants')

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
  const activeTabDef = allTabs.find(td => td.key === tab) ?? allTabs[0]
  const activeTab = activeTabDef.key
  const ActiveTabIcon = activeTabDef.icon

  return (
    <>
      <div className="flex flex-col">
        <EventInfoPanel event={event} isOrganizer={isOrganizer} />
        <EventOverview event={event} />

        {/* Quiet Rail: компактная навигация по рабочим разделам встречи. */}
        <div className="mt-[13px] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          <div className="border-b border-line-soft p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-3">
                {t('eventInfo.allDetails')}
              </div>
              {isOrganizer && event.status === 'active' && (
                <Button variant="outline" size="sm" onClick={() => setCompleteOpen(true)}>
                  <CheckCircle2 size={13} />
                  {t('eventInfo.menuComplete', 'Завершить')}
                </Button>
              )}
            </div>

            <div
              role="tablist"
              aria-label={t('eventInfo.allDetails')}
              className="mt-3 grid min-w-0 grid-cols-2 gap-1 rounded-[11px] bg-bg-2 p-1 sm:grid-cols-3 lg:flex"
            >
              {allTabs.map(td => {
                const active = td.key === activeTab
                const label = t(td.tKey, td.fallback)

                return (
                  <Tooltip key={td.key}>
                    <TooltipTrigger asChild>
                      <button
                        id={`event-tab-${td.key}`}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls="event-section-panel"
                        aria-label={label}
                        onClick={() => setTab(td.key)}
                        className={cn(
                          'flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-[8px] px-2 text-[11px] font-semibold transition focus-ring lg:flex-1',
                          active
                            ? 'bg-surface text-ink shadow-[0_1px_4px_rgba(20,20,20,0.06)]'
                            : 'text-ink-3 hover:bg-hover hover:text-ink',
                        )}
                      >
                        <td.icon size={15} className="shrink-0" />
                        <span className="min-w-0 truncate">{label}</span>
                        {td.key === 'chat' && chatUnread > 0 && (
                          <span className="grid min-h-[14px] min-w-[14px] shrink-0 place-items-center rounded-full bg-danger px-0.5 text-[8px] font-bold leading-none text-white tnum">
                            {chatUnread > 9 ? '9+' : chatUnread}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{label}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
            <ActiveTabIcon size={15} className="text-ink-3" />
            <h2 className="text-[13px] font-bold text-ink">
              {t(activeTabDef.tKey, activeTabDef.fallback)}
            </h2>
          </div>

          <div
            id="event-section-panel"
            role="tabpanel"
            aria-labelledby={`event-tab-${activeTab}`}
            className="p-4 sm:p-6"
          >
            {activeTab === 'participants' && <ParticipantsTab event={event} />}
            {activeTab === 'collections' && <CollectionsTab event={event} />}
            {activeTab === 'polls' && <PollsTab event={event} />}
            {activeTab === 'items' && <ItemsTab event={event} />}
            {activeTab === 'carpools' && <CarpoolTab event={event} />}
            {activeTab === 'chat' && <ChatTab event={event} />}
            {activeTab === 'changelog' && (
              <div className="flex flex-col gap-3">
                {[...event.change_log].reverse().map(log => (
                  <div
                    key={log.id}
                    className="rounded-[12px] border border-line bg-bg-2 p-3.5"
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Avatar name={log.changed_by.name} size="xs" />
                      <span className="text-[13px] font-medium text-ink">{log.changed_by.name}</span>
                      <span className="text-[12px] text-ink-3">
                        {t('events.changed', { field: log.field_name, defaultValue: `изменил «${log.field_name}»` })}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-ink-3">
                        <Clock size={12} />
                        {formatDateTime(log.changed_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-[4px] px-2 py-[2px] text-[11px] font-medium bg-danger/10 text-danger">
                        {log.old_value || '—'}
                      </span>
                      <span className="text-ink-3 text-[13px]">→</span>
                      <span className="inline-flex items-center rounded-[4px] px-2 py-[2px] text-[11px] font-medium bg-success/10 text-success">
                        {log.new_value || '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

function EventOverview({ event }: { event: Event }) {
  const { t } = useTranslation()
  const poll = event.polls[0]
  const totalVotes = poll?.options.reduce((sum, option) => sum + option.vote_count, 0) ?? 0
  const readyItems = event.items.filter(item => item.assigned_to).length

  if (!poll && event.items.length === 0) return null

  return (
    <div className="mt-[13px]">
      <section className="min-w-0 rounded-[var(--radius-card)] border border-line bg-surface p-[17px]">
          {poll && (
            <div>
              <PanelHead
                title={poll.question}
                meta={t('eventInfo.votesCount', { count: totalVotes })}
              />
              <div className="flex flex-col gap-3">
                {poll.options.map(option => {
                  const percentage = totalVotes > 0 ? Math.round(option.vote_count / totalVotes * 100) : 0
                  return (
                    <div key={option.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] text-ink-2">
                        <strong className="truncate font-semibold text-ink">{option.label}</strong>
                        <span className="shrink-0 tnum">{option.vote_count} · {percentage}%</span>
                      </div>
                      <div className="h-[7px] overflow-hidden rounded-full bg-bg-2">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-rose),var(--color-brand-violet),var(--color-brand-sky))]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {event.items.length > 0 && (
            <div className={cn(poll && 'mt-[13px] border-t border-line pt-[13px]')}>
              <PanelHead
                title={t('eventInfo.whatToTake')}
                meta={t('eventInfo.itemsReady', { ready: readyItems, total: event.items.length })}
              />
              <div className="flex flex-col gap-2">
                {event.items.slice(0, 6).map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-[9.5px] text-ink-2">
                    <span
                      className={cn(
                        'grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border',
                        item.assigned_to ? 'border-success bg-success text-white' : 'border-line bg-surface text-transparent',
                      )}
                    >
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </section>
    </div>
  )
}

function PanelHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="mb-[14px] flex items-center justify-between gap-2.5">
      <h2 className="text-[12px] font-bold text-ink">{title}</h2>
      <span className="shrink-0 text-[9px] text-ink-3">{meta}</span>
    </div>
  )
}
