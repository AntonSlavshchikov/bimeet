export type Role = 'owner' | 'member'

export interface User {
  id: string
  company_id: string
  email: string
  name: string
  role: Role
  is_active: boolean
  created_at: string
}
