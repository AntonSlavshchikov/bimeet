import { Bell, Check, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/entities/notification/queries'
import { notificationHref } from '@/entities/notification/lib/href'
import { useDeleteNotification, useMarkRead } from '@/features/notifications/model/hooks'
import { formatDate } from '@/shared/lib/formatDate'
import { cn } from '@/shared/lib/cn'

export default function NotificationsPage() {
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkRead()
  const deleteOne = useDeleteNotification()
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Bell size={28} className="text-ink-3" />
        <div className="text-[14px] text-ink-3">{t('notifications.empty', 'Нет уведомлений')}</div>
      </div>
    )
  }

  return (
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
  )
}
