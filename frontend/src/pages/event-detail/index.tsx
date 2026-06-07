import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  History,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { useEvent } from '@/entities/event/queries'
import { useAuth } from '@/features/auth/model/AuthContext'
import { useCompleteEvent } from '@/features/event-manage/model/hooks'
import ParticipantsTab from '@/features/participants/ui/ParticipantsTab'
import CollectionsTab from '@/features/collections/ui/CollectionsTab'
import PollsTab from '@/features/polls/ui/PollsTab'
import ItemsTab from '@/features/items/ui/ItemsTab'
import CarpoolTab from '@/features/carpools/ui/CarpoolTab'
import EventInfoPanel from '@/widgets/event-detail/EventInfoPanel'
import ParticipantsSummaryPanel from '@/widgets/event-detail/ParticipantsSummaryPanel'
import { formatDateTime } from '@/shared/lib/formatDate'
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SegmentedControl,
} from '@/shared/ui'

type TabKey = 'participants' | 'collections' | 'polls' | 'items' | 'carpools' | 'changelog'

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

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const event = useEvent(id!)
  const { user } = useAuth()
  const { t } = useTranslation()
  const [completeOpen, setCompleteOpen] = useState(false)
  const tabParam = searchParams.get('tab') as TabKey | null
  const [tab, setTab] = useState<TabKey>(tabParam ?? 'participants')

  const completeEvent = useCompleteEvent(id ?? '')

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

  const isOrganizer = event.organizer.id === user?.id

  const allTabs: TabDef[] =
    event.change_log.length > 0
      ? [...ORDINARY_TABS, { key: 'changelog', tKey: 'tabs.history', fallback: 'История', icon: History }]
      : ORDINARY_TABS

  // Фолбэк: если активный таб не входит в набор, переключаемся на первый
  const activeTab: TabKey = allTabs.some(td => td.key === tab) ? tab : allTabs[0].key

  return (
    <>
      <div className="grid gap-5 items-start xl:grid-cols-[320px_minmax(0,1fr)]">

        {/* Left — sticky on xl */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-5">
          <EventInfoPanel event={event} isOrganizer={isOrganizer} />
          <ParticipantsSummaryPanel event={event} />
        </div>

        {/* Right — tabs */}
        <div className="rounded-[14px] border border-line bg-surface overflow-hidden">
          {event.status === 'completed' && (
            <div className="flex items-center gap-2 bg-warning/10 text-warning border-b border-warning/20 px-4 py-2.5 text-[13px] font-medium">
              <AlertTriangle size={14} />
              <span>{t('events.completedAlert', 'Эта встреча завершена')}</span>
            </div>
          )}

          {/* Tab bar + organizer complete action */}
          <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3 pt-3 pb-3 flex-wrap">
            <div className="overflow-x-auto -m-1 p-1">
              <SegmentedControl
                value={activeTab}
                onChange={(v: TabKey) => setTab(v)}
                options={allTabs.map(td => ({
                  value: td.key,
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <td.icon size={13} className="shrink-0" />
                      {t(td.tKey, td.fallback)}
                    </span>
                  ),
                }))}
              />
            </div>
            {isOrganizer && event.status === 'active' && (
              <Button variant="outline" size="sm" onClick={() => setCompleteOpen(true)}>
                <CheckCircle2 size={13} />
                {t('eventInfo.menuComplete', 'Завершить')}
              </Button>
            )}
          </div>

          {/* Tab content — feature-tabs пока на Chakra (24.5) */}
          <div className="p-4 sm:p-6">
            {activeTab === 'participants' && <ParticipantsTab event={event} />}
            {activeTab === 'collections' && <CollectionsTab event={event} />}
            {activeTab === 'polls' && <PollsTab event={event} />}
            {activeTab === 'items' && <ItemsTab event={event} />}
            {activeTab === 'carpools' && <CarpoolTab event={event} />}
            {activeTab === 'changelog' && (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                  {t('events.changeHistory', 'История изменений')}
                </div>
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
