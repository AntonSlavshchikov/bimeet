import { describe, expect, it } from 'vitest'
import type { EventListItem } from '@/entities/event/model/types'
import {
  filterEventsByProfileStat,
  profileStatBaseTab,
  profileStatHref,
  resolveProfileStat,
} from './index'

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
    last_activity_at: '2026-07-01T00:00:00Z',
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
    date_start: '2026-07-01T12:00:00Z',
    date_end: '2026-07-01T14:00:00Z',
    status: 'completed',
    organizer: { name: 'Me', email: 'me@example.com', is_me: true },
  }),
  event('guest-confirmed-active', { my_status: 'confirmed' }),
  event('guest-confirmed-completed', {
    date_start: '2026-07-20T12:00:00Z',
    date_end: '2026-07-20T14:00:00Z',
    status: 'completed',
    my_status: 'confirmed',
  }),
  event('guest-invited', { my_status: 'invited' }),
  event('guest-declined', { my_status: 'declined' }),
  event('guest-invited-completed', { status: 'completed', my_status: 'invited' }),
]

describe('profile statistics navigation', () => {
  it('builds canonical URLs with the corresponding regular event tab', () => {
    expect(profileStatHref('organized')).toBe('/events?tab=organizing&stat=organized')
    expect(profileStatHref('participated')).toBe('/events?tab=participated&stat=participated')
    expect(profileStatHref('completed')).toBe('/events?tab=participated&stat=completed')
    expect(profileStatHref('upcoming')).toBe('/events?tab=attending&stat=upcoming')
  })

  it('resolves only supported stat parameters', () => {
    expect(resolveProfileStat('organized')).toBe('organized')
    expect(resolveProfileStat('unknown')).toBeNull()
    expect(resolveProfileStat(null)).toBeNull()
  })

  it('keeps the base tab available when the statistics filter is cleared', () => {
    expect(profileStatBaseTab('organized')).toBe('organizing')
    expect(profileStatBaseTab('participated')).toBe('participated')
    expect(profileStatBaseTab('completed')).toBe('participated')
    expect(profileStatBaseTab('upcoming')).toBe('attending')
  })
})

describe('profile statistics event filters', () => {
  it('includes every event organized by the user, regardless of status', () => {
    expect(filterEventsByProfileStat(EVENTS, 'organized').map(item => item.id)).toEqual([
      'host-active',
      'host-completed',
    ])
  })

  it('includes completed hosted and confirmed participation', () => {
    expect(filterEventsByProfileStat(EVENTS, 'participated').map(item => item.id)).toEqual([
      'host-completed',
      'guest-confirmed-completed',
    ])
  })

  it('includes only completed events organized by the user', () => {
    expect(filterEventsByProfileStat(EVENTS, 'completed').map(item => item.id)).toEqual([
      'host-completed',
    ])
  })

  it('includes only confirmed active guest participation in upcoming', () => {
    expect(filterEventsByProfileStat(EVENTS, 'upcoming').map(item => item.id)).toEqual([
      'guest-confirmed-active',
    ])
  })

  it('does not count an active event organized by the user as upcoming', () => {
    expect(filterEventsByProfileStat(EVENTS, 'upcoming')).not.toContainEqual(
      expect.objectContaining({ id: 'host-active' }),
    )
  })
})
