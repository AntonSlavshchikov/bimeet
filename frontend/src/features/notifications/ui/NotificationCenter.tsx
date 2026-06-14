import { Bell, Check, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/entities/notification/queries'
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
} from '@/features/notifications/model/hooks'
import { formatDate } from '@/shared/lib/formatDate'
import { notificationHref } from '@/entities/notification/lib/href'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface NotificationCenterProps {
  /** Кастомный trigger (например, nav-item в sidebar). По умолчанию — Bell icon-button. */
  renderTrigger?: (state: { count: number }) => React.ReactNode
}

export default function NotificationCenter({ renderTrigger }: NotificationCenterProps = {}) {
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const deleteOne = useDeleteNotification()
  const deleteAll = useDeleteAllNotifications()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        {renderTrigger ? (
          renderTrigger({ count: unreadCount })
        ) : (
          <button
            type="button"
            aria-label={t('notifications.title')}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-ink-2 hover:bg-hover hover:text-ink transition focus-ring"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-white tnum"
                aria-hidden
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] max-h-[480px] p-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
          <div className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
            {t('notifications.title')}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('notifications.markAllRead')}
                  disabled={unreadCount === 0 || markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-success transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Check size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('notifications.markAllRead')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('notifications.deleteAll')}
                  disabled={notifications.length === 0 || deleteAll.isPending}
                  onClick={() => deleteAll.mutate()}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-danger transition disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Trash2 size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t('notifications.deleteAll')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-ink-3">
              {t('notifications.empty')}
            </div>
          ) : (
            <ul className="flex flex-col">
              {notifications.map(n => {
                const href = notificationHref(n)
                return (
                  <li
                    key={n.id}
                    className={cn(
                      'group relative flex items-start gap-3 border-b border-line-soft px-4 py-3 last:border-b-0 transition',
                      href && 'cursor-pointer hover:bg-hover',
                    )}
                    onClick={href ? () => {
                      if (!n.is_read) markRead.mutate(n.id)
                      navigate(href)
                    } : undefined}
                  >
                    <div className="pt-[5px] flex-shrink-0">
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
                          'text-[13.5px] leading-[1.4] line-clamp-2',
                          n.is_read ? 'text-ink-3 font-normal' : 'text-ink font-medium',
                        )}
                      >
                        {n.message}
                        {n.count > 1 && (
                          <span className="ml-1.5 inline-flex items-center rounded-full bg-accent/15 px-1.5 text-[11px] font-semibold text-accent align-middle tnum">
                            ×{n.count}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-ink-3">
                        {formatDate(n.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                      {!n.is_read && (
                        <button
                          type="button"
                          aria-label={t('notifications.markRead')}
                          onClick={e => { e.stopPropagation(); markRead.mutate(n.id) }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:text-success transition"
                        >
                          <Check size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={t('notifications.deleteOne')}
                        onClick={e => { e.stopPropagation(); deleteOne.mutate(n.id) }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] text-ink-3 hover:text-danger transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

