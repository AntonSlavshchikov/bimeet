import { describe, expect, it } from 'vitest'
import type { EventListItem } from '@/entities/event/model/types'
import { filterEventsByTab, parseEventsListTab, resolveEventsListTab } from './tabs'

function event(
  id: string,
  overrides: Partial<EventListItem> = {},
): EventListItem {
  return {
    id,
    title: id,
    description: '',
    date_start: '2026-08-02T12:00:00Z',
    date_end: '2026-08-02T14:00:00Z',
    location: 'Place',
    city: null,
    status: 'active',
    is_public: false,
    confirmed_count: 1,
    organizer: { name: 'Organizer', email: 'organizer@example.com', is_me: false },
    invite_token: 'invite-token',
    created_at: '2026-07-01T00:00:00Z',
    my_status: '',
    participants: [],
    ...overrides,
  }
}

const EVENTS = [
  event('host-active', {
    organizer: { name: 'Me', email: 'me@example.com', is_me: true },
  }),
  event('host-completed', {
    status: 'completed',
    organizer: { name: 'Me', email: 'me@example.com', is_me: true },
  }),
  event('guest-confirmed-active', { my_status: 'confirmed' }),
  event('guest-confirmed-completed', { status: 'completed', my_status: 'confirmed' }),
  event('guest-invited-active', { my_status: 'invited' }),
  event('guest-invited-completed', { status: 'completed', my_status: 'invited' }),
  event('guest-declined-active', { my_status: 'declined' }),
  event('guest-declined-completed', { status: 'completed', my_status: 'declined' }),
]

describe('events list tabs', () => {
  it('resolves canonical tabs and keeps past as a legacy alias', () => {
    expect(resolveEventsListTab('invited')).toBe('invited')
    expect(resolveEventsListTab('participated')).toBe('participated')
    expect(resolveEventsListTab('past')).toBe('participated')
    expect(resolveEventsListTab('unknown')).toBe('all')
    expect(resolveEventsListTab(null, 'attending')).toBe('attending')
    expect(parseEventsListTab('unknown')).toBeNull()
  })

  it('shows every active relationship in all', () => {
    expect(filterEventsByTab(EVENTS, 'all').map(item => item.id)).toEqual([
      'host-active',
      'guest-confirmed-active',
      'guest-invited-active',
      'guest-declined-active',
    ])
  })

  it('shows only active invitations awaiting a response', () => {
    expect(filterEventsByTab(EVENTS, 'invited').map(item => item.id)).toEqual([
      'guest-invited-active',
    ])
  })

  it('shows only confirmed active guest participation in attending', () => {
    expect(filterEventsByTab(EVENTS, 'attending').map(item => item.id)).toEqual([
      'guest-confirmed-active',
    ])
  })

  it('shows only active events hosted by the user in organizing', () => {
    expect(filterEventsByTab(EVENTS, 'organizing').map(item => item.id)).toEqual([
      'host-active',
    ])
  })

  it('shows completed hosted or confirmed events in participated', () => {
    expect(filterEventsByTab(EVENTS, 'participated').map(item => item.id)).toEqual([
      'host-completed',
      'guest-confirmed-completed',
    ])
  })
})
