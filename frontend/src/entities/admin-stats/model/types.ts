export interface AdminOverview {
  total_users: number
  users_active_7d: number
  users_active_30d: number
  total_events: number
  events_active: number
  events_completed: number
  total_collections: number
  total_collected: number
}

export interface AdminTimeseriesPoint {
  date: string // YYYY-MM-DD
  users: number
  events: number
}

export interface AdminTimeseries {
  points: AdminTimeseriesPoint[]
}

export interface AdminDistributionItem {
  key: string
  count: number
}

export interface AdminDistribution {
  by_category: AdminDistributionItem[]
  by_status: AdminDistributionItem[]
  by_visibility: AdminDistributionItem[]
}

export interface OrganizerStat {
  user_id: string
  name: string
  email: string
  event_count: number
}

export interface AdminUserRow {
  id: string
  name: string
  last_name: string
  email: string
  city: string
  created_at: string
}

export interface AdminEventRow {
  id: string
  title: string
  category: 'ordinary' | 'business'
  status: 'active' | 'completed'
  is_public: boolean
  organizer_id: string
  organizer_email: string
  date_start: string
  created_at: string
}
