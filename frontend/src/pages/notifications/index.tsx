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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui'
import { GooeyTabs } from '@/shared/ui/gooey-tabs'
import { cn } from '@/shared/lib/cn'
import type { Notification } from '@/entities/notification/model/types'

type Filter = 'all' | 'unread'

export default function NotificationsPage() {
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const deleteOne = useDeleteNotification()
  const deleteAll = useDeleteAllNotifications()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')

  const unreadCount = notifications.filter(n => !n.is_read).length
  const visible = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications

  const groups = useMemo(() => {
    const out: { label: string; items: Notification[] }[] = []
    for (const n of visible) {
      const label = dateGroupLabel(n.created_at)
      const last = out[out.length - 1]
      if (last?.label === label) last.items.push(n)
      else out.push({ label, items: [n] })
    }
    return out
  }, [visible])

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop header — заголовок + действия (на мобиле они в навбаре). */}
      <div className="hidden lg:flex items-center justify-between">
        <h1 className="text-[20px] font-bold tracking-[-0.02em] text-ink">
          {t('nav.notifications', 'Уведомления')}
        </h1>
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
      </div>

      {notifications.length > 0 && (
        <GooeyTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('notifications.filterAll', 'Все') },
            {
              value: 'unread',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {t('notifications.filterUnread', 'Непрочитанные')}
                  {unreadCount > 0 && (
                    <span className="tnum">{unreadCount}</span>
                  )}
                </span>
              ),
            },
          ]}
        />
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          {filter === 'unread' ? (
            <>
              <Check size={26} className="text-success" />
              <div className="text-[14px] font-medium text-ink">{t('notifications.emptyUnreadTitle', 'Всё прочитано')}</div>
              <div className="text-[13px] text-ink-3">{t('notifications.emptyUnreadBody', 'Непрочитанных уведомлений нет.')}</div>
            </>
          ) : (
            <>
              <BellOff size={26} className="text-ink-3" />
              <div className="text-[14px] font-medium text-ink">{t('notifications.emptyTitle', 'Здесь появятся уведомления')}</div>
              <div className="text-[13px] text-ink-3 max-w-[280px]">{t('notifications.emptyBody', 'Приглашения, изменения встреч и новые сообщения — всё соберётся тут.')}</div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(group => (
            <div key={group.label}>
              <div className="px-1 pb-2 text-[11px] font-semibold tracking-[0.04em] text-ink-4 uppercase">
                {group.label}
              </div>
              <div className="rounded-[14px] border border-line bg-surface overflow-hidden">
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
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div
                            className={cn(
                              'text-[14px] leading-[1.45]',
                              n.is_read ? 'text-ink-3 font-normal' : 'text-ink font-medium',
                            )}
                          >
                            {n.message}
                            {n.count > 1 && (
                              <span className="ml-1.5 inline-flex items-center rounded-full bg-accent/15 px-1.5 text-[11.5px] font-semibold text-accent align-middle tnum">
                                ×{n.count}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[12px] text-ink-3">
                            {formatRelative(n.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {!n.is_read && (
                            <button
                              type="button"
                              aria-label={t('notifications.markRead', 'Отметить прочитанным')}
                              onClick={e => { e.stopPropagation(); markRead.mutate(n.id) }}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-ink-3 hover:text-success hover:bg-hover transition focus-ring"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={t('notifications.deleteOne', 'Удалить')}
                            onClick={e => { e.stopPropagation(); deleteOne.mutate(n.id) }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-ink-3 hover:text-danger hover:bg-hover transition focus-ring"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
