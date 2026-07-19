import { useMemo, useState } from 'react'
import { BellOff, Check, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/entities/notification/queries'
import { notificationHref } from '@/entities/notification/lib/href'
import { notificationIcon } from '@/entities/notification/lib/icon'
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
} from '@/features/notifications/model/hooks'
import { dateGroupLabel, formatRelative } from '@/shared/lib/formatDate'
import {
  EmptyState,
  PageHeader,
  SegmentedControl,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import type { Notification } from '@/entities/notification/model/types'

type Filter = 'all' | 'unread'

export default function NotificationsPage() {
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const deleteOne = useDeleteNotification()
  const deleteAll = useDeleteAllNotifications()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')

  const unreadCount = notifications.filter(n => !n.is_read).length
  const visible = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications
  const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU'

  const groups = useMemo(() => {
    const out: { label: string; items: Notification[] }[] = []
    for (const n of visible) {
      const label = dateGroupLabel(n.created_at, locale)
      const last = out[out.length - 1]
      if (last?.label === label) last.items.push(n)
      else out.push({ label, items: [n] })
    }
    return out
  }, [locale, visible])

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop header — заголовок + действия (на мобиле они в навбаре). */}
      <div className="hidden min-[761px]:block">
        <PageHeader title={t('nav.notifications', 'Уведомления')} actions={(
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('notifications.markAllRead', 'Прочитать все')}
                disabled={unreadCount === 0 || markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-ink-3 hover:bg-hover hover:text-success transition focus-ring disabled:opacity-40 disabled:pointer-events-none"
              >
                <Check size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('notifications.markAllRead', 'Прочитать все')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t('notifications.deleteAll', 'Удалить все')}
                disabled={notifications.length === 0 || deleteAll.isPending}
                onClick={() => deleteAll.mutate()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-ink-3 hover:bg-hover hover:text-danger transition focus-ring disabled:opacity-40 disabled:pointer-events-none"
              >
                <Trash2 size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('notifications.deleteAll', 'Удалить все')}</TooltipContent>
          </Tooltip>
        </div>
        )} />
      </div>

      {notifications.length > 0 && (
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('notifications.filterAll') },
            { value: 'unread', label: t('notifications.filterUnread'), count: unreadCount || undefined },
          ]}
        />
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={filter === 'unread' ? Check : BellOff}
          title={filter === 'unread' ? t('notifications.emptyUnreadTitle') : t('notifications.emptyTitle')}
          description={filter === 'unread' ? t('notifications.emptyUnreadBody') : t('notifications.emptyBody')}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(group => (
            <section key={group.label}>
              <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                {group.label}
              </div>
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
                <ul className="flex flex-col">
                  {group.items.map(n => {
                    const href = notificationHref(n)
                    const Icon = notificationIcon(n.type)
                    return (
                      <li
                        key={n.id}
                        className={cn(
                          'flex items-start gap-3 border-b border-line-soft px-4 py-3.5 last:border-b-0 transition',
                          href && 'cursor-pointer active:bg-hover',
                          !n.is_read && 'bg-[color-mix(in_srgb,var(--color-brand-b)_5%,var(--color-surface))]',
                        )}
                        onClick={href ? () => {
                          if (!n.is_read) markRead.mutate(n.id)
                          navigate(href)
                        } : undefined}
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            n.is_read ? 'bg-line-soft text-ink-3' : 'bg-accent/12 text-accent',
                          )}
                        >
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className={cn('text-[14px] leading-[1.45]', n.is_read ? 'font-normal text-ink-3' : 'font-medium text-ink')}>
                            {n.message}
                            {n.count > 1 && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-accent/15 px-1.5 text-[11.5px] font-semibold text-accent align-middle tnum">
                                ×{n.count}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[12px] text-ink-3">{formatRelative(n.created_at, locale)}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {!n.is_read && (
                            <button
                              type="button"
                              aria-label={t('notifications.markRead')}
                              onClick={event => { event.stopPropagation(); markRead.mutate(n.id) }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-ink-3 transition hover:bg-hover hover:text-success focus-ring"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={t('notifications.deleteOne')}
                            onClick={event => { event.stopPropagation(); deleteOne.mutate(n.id) }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-ink-3 transition hover:bg-hover hover:text-danger focus-ring"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
