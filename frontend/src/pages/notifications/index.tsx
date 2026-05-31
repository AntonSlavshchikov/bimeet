import { Bell, Check, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/entities/notification/queries'
import { notificationHref } from '@/entities/notification/lib/href'
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
} from '@/features/notifications/model/hooks'
import { formatDate } from '@/shared/lib/formatDate'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function NotificationsPage() {
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const deleteOne = useDeleteNotification()
  const deleteAll = useDeleteAllNotifications()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const unreadCount = notifications.filter(n => !n.is_read).length

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

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Bell size={28} className="text-ink-3" />
          <div className="text-[14px] text-ink-3">{t('notifications.empty', 'Нет уведомлений')}</div>
        </div>
      ) : (
        <div className="rounded-[14px] border border-line bg-surface overflow-hidden">
          <ul className="flex flex-col">
            {notifications.map(n => {
              const href = notificationHref(n)
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
                  <div className="pt-[6px] flex-shrink-0">
                    <div
                      className={cn(
                        'h-[7px] w-[7px] rounded-full border-[1.5px]',
                        n.is_read ? 'bg-transparent border-line' : 'bg-accent border-accent',
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'text-[14px] leading-[1.45]',
                        n.is_read ? 'text-ink-3 font-normal' : 'text-ink font-medium',
                      )}
                    >
                      {n.message}
                    </div>
                    <div className="mt-1 text-[12px] text-ink-3">
                      {formatDate(n.created_at)}
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
      )}
    </div>
  )
}
