import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '@/entities/notification/api'
import { notificationKeys } from '@/entities/notification/queries'

export function useNotificationActions() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: notificationKeys.all })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: invalidate,
  })
  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: invalidate,
  })

  return { markRead, markAllRead }
}
