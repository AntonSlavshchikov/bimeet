import { apiFetch } from '@/shared/api/client'
import type {
  AdminDistribution,
  AdminEventRow,
  AdminOverview,
  AdminTimeseries,
  AdminUserRow,
  OrganizerStat,
} from '@/entities/admin-stats/model/types'

export const adminStatsApi = {
  getOverview: () => apiFetch<AdminOverview>('/api/admin/overview'),
  getTimeseries: (days: number) =>
    apiFetch<AdminTimeseries>(`/api/admin/timeseries?days=${days}`),
  getDistribution: () => apiFetch<AdminDistribution>('/api/admin/distribution'),
  getTopOrganizers: (limit = 10) =>
    apiFetch<OrganizerStat[]>(`/api/admin/top-organizers?limit=${limit}`),
  getRecentUsers: (limit = 20) =>
    apiFetch<AdminUserRow[]>(`/api/admin/recent-users?limit=${limit}`),
  getRecentEvents: (limit = 20) =>
    apiFetch<AdminEventRow[]>(`/api/admin/recent-events?limit=${limit}`),
}
