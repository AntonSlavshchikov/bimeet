export type EventTabKey = 'participants' | 'collections' | 'polls' | 'items' | 'carpools' | 'chat' | 'changelog'

export function resolveEventTab(raw: string | null, available: readonly EventTabKey[]): EventTabKey {
  if (raw && available.includes(raw as EventTabKey)) return raw as EventTabKey
  return available[0] ?? 'participants'
}

export function withEventTab(search: URLSearchParams, next: EventTabKey): URLSearchParams {
  const params = new URLSearchParams(search)
  if (next === 'participants') params.delete('tab')
  else params.set('tab', next)
  return params
}
