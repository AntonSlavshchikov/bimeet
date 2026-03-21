export interface CollectionContribution {
  user_id: string
  paid: boolean
  paid_at?: string
}

export interface Collection {
  id: string
  title: string
  target_amount: number
  created_by: string
  created_at: string
  contributions: CollectionContribution[]
}
