import { useQuery } from '@tanstack/react-query'
import { notificationApi } from './api'

export const notificationKeys = {
  all: ['notifications'] as const,
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: notificationApi.list,
  })
}
