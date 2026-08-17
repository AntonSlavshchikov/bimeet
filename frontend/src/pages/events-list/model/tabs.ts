import type { EventListItem } from '@/entities/event/model/types'

export const EVENTS_LIST_TABS = [
  'all',
  'invited',
  'attending',
  'organizing',
  'participated',
] as const

export type EventsListTab = (typeof EVENTS_LIST_TABS)[number]

export function parseEventsListTab(value: string | null): EventsListTab | null {
  if (value === 'past') return 'participated'
  return EVENTS_LIST_TABS.find(tab => tab === value) ?? null
}

export function resolveEventsListTab(
  value: string | null,
  fallback: EventsListTab = 'all',
): EventsListTab {
  return parseEventsListTab(value) ?? fallback
}

export function filterEventsByTab(
  events: EventListItem[],
  tab: EventsListTab,
): EventListItem[] {
  switch (tab) {
    case 'all':
      return events.filter(event => event.status === 'active')
    case 'invited':
      return events.filter(event =>
        event.status === 'active' &&
        !event.organizer.is_me &&
        event.my_status === 'invited'
      )
    case 'attending':
      return events.filter(event =>
        event.status === 'active' &&
        !event.organizer.is_me &&
        event.my_status === 'confirmed'
      )
    case 'organizing':
      return events.filter(event => event.status === 'active' && event.organizer.is_me)
    case 'participated':
      return events.filter(event =>
        event.status === 'completed' &&
        (event.organizer.is_me || event.my_status === 'confirmed')
      )
  }
}
