export interface Notification {
  id: string
  event_id?: string
  type: string
  message: string
  is_read: boolean
  count: number // collapsed events of the same kind (e.g. chat messages)
  created_at: string
}
