import { Check, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@/entities/notification/queries'
import { useDeleteAllNotifications, useMarkAllRead } from '@/features/notifications/model/hooks'

export default function NotificationsNavbarActions() {
  const { t } = useTranslation()
  const { data: notifications = [] } = useNotifications()
  const markAllRead = useMarkAllRead()
  const deleteAll = useDeleteAllNotifications()

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <>
      <button
        type="button"
        aria-label={t('notifications.markAllRead', 'Прочитать все')}
        disabled={unread === 0 || markAllRead.isPending}
        onClick={() => markAllRead.mutate()}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-accent hover:bg-hover transition focus-ring disabled:opacity-40 disabled:pointer-events-none"
      >
        <Check size={18} />
      </button>
      <button
        type="button"
        aria-label={t('notifications.deleteAll', 'Удалить все')}
        disabled={notifications.length === 0 || deleteAll.isPending}
        onClick={() => deleteAll.mutate()}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-accent hover:bg-hover transition focus-ring disabled:opacity-40 disabled:pointer-events-none"
      >
        <Trash2 size={18} />
      </button>
    </>
  )
}
