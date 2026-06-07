export interface Notification {
  id: string
  user_id: string
  event_id: string | null
  type: string
  message: string
  is_read: boolean
  created_at: string
}
