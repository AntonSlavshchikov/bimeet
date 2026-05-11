import { useQuery } from '@tanstack/react-query'
import { adminStatsApi } from '@/entities/admin-stats/api'

const STALE = 60_000

export const adminStatsKeys = {
  overview: ['admin', 'overview'] as const,
  timeseries: (days: number) => ['admin', 'timeseries', days] as const,
  distribution: ['admin', 'distribution'] as const,
  topOrganizers: (limit: number) => ['admin', 'top-organizers', limit] as const,
  recentUsers: (limit: number) => ['admin', 'recent-users', limit] as const,
  recentEvents: (limit: number) => ['admin', 'recent-events', limit] as const,
}

export function useAdminOverview() {
  return useQuery({
    queryKey: adminStatsKeys.overview,
    queryFn: adminStatsApi.getOverview,
    staleTime: STALE,
  })
}

export function useAdminTimeseries(days: number) {
  return useQuery({
    queryKey: adminStatsKeys.timeseries(days),
    queryFn: () => adminStatsApi.getTimeseries(days),
    staleTime: STALE,
  })
}

export function useAdminDistribution() {
  return useQuery({
    queryKey: adminStatsKeys.distribution,
    queryFn: adminStatsApi.getDistribution,
    staleTime: STALE,
  })
}

export function useAdminTopOrganizers(limit = 10) {
  return useQuery({
    queryKey: adminStatsKeys.topOrganizers(limit),
    queryFn: () => adminStatsApi.getTopOrganizers(limit),
    staleTime: STALE,
  })
}

export function useAdminRecentUsers(limit = 20) {
  return useQuery({
    queryKey: adminStatsKeys.recentUsers(limit),
    queryFn: () => adminStatsApi.getRecentUsers(limit),
    staleTime: STALE,
  })
}

export function useAdminRecentEvents(limit = 20) {
  return useQuery({
    queryKey: adminStatsKeys.recentEvents(limit),
    queryFn: () => adminStatsApi.getRecentEvents(limit),
    staleTime: STALE,
  })
}
