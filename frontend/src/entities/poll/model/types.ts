export interface PollOption {
  id: string
  label: string
  vote_count: number
  voted: boolean // whether the current user voted for this option
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  created_by: string
  created_at: string
}
