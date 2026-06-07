import { Link } from 'react-router-dom'
import { useNotifications } from '@/entities/notification/queries'
import { useNotificationActions } from '@/features/notifications/hooks'
import { formatDateTime } from '@/shared/lib/date'
import { Button, Spinner } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

export default function NotificationsPage() {
  const { data: items, isLoading } = useNotifications()
  const { markRead, markAllRead } = useNotificationActions()
  const hasUnread = items?.some(n => !n.is_read)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">Уведомления</h1>
        {hasUnread && (
          <Button variant="ghost" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
            Прочитать все
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Spinner className="w-7 h-7" /></div>
      ) : !items || items.length === 0 ? (
        <p className="py-20 text-center text-[14px] text-ink-3">Уведомлений нет</p>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface divide-y divide-line-soft">
          {items.map(n => {
            const body = (
              <div className="flex items-start gap-3 px-4 py-3">
                <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', n.is_read ? 'bg-transparent' : 'bg-accent')} />
                <div className="min-w-0">
                  <div className={cn('text-[14px]', n.is_read ? 'text-ink-2' : 'text-ink font-medium')}>{n.message}</div>
                  <div className="text-[12.5px] text-ink-3 mt-0.5">{formatDateTime(n.created_at)}</div>
                </div>
              </div>
            )
            const onClick = () => !n.is_read && markRead.mutate(n.id)
            return n.event_id ? (
              <Link key={n.id} to={`/events/${n.event_id}`} onClick={onClick} className="block hover:bg-hover">
                {body}
              </Link>
            ) : (
              <button key={n.id} onClick={onClick} className="block w-full text-left hover:bg-hover">
                {body}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
