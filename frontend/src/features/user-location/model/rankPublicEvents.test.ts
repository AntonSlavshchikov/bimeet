import { describe, expect, it } from 'vitest'
import type { PublicEventListItem } from '@/entities/event/model/types'
import { buildPublicEventList } from './rankPublicEvents'
import type { UserPosition } from './useUserLocation'

const NOW = new Date('2026-07-15T12:00:00Z').getTime()
const POSITION: UserPosition = { latitude: 0, longitude: 0, accuracy: 20 }

function latitudeAt(distanceKm: number): number {
  return distanceKm / 111.195
}

function eventAt(
  id: string,
  distanceKm?: number,
  overrides: Partial<PublicEventListItem> = {},
): PublicEventListItem {
  return {
    id,
    title: id,
    description: '',
    date_start: '2026-07-16T12:00:00Z',
    date_end: '2026-07-16T14:00:00Z',
    location: 'Place',
    city: null,
    ...(distanceKm == null
      ? {}
      : { location_lat: latitudeAt(distanceKm), location_lng: 0 }),
    status: 'active',
    is_public: true,
    confirmed_count: 0,
    organizer: { name: 'Organizer', is_me: false },
    created_at: '2026-07-01T00:00:00Z',
    my_status: '',
    participants: [],
    is_participant: false,
    ...overrides,
  }
}

function grouped(events: PublicEventListItem[], position = POSITION) {
  const result = buildPublicEventList(events, position, NOW)
  expect(result.mode).toBe('grouped')
  if (result.mode !== 'grouped') throw new Error('expected grouped result')
  return result
}

describe('buildPublicEventList', () => {
  it('uses 10 km when it contains at least ten available events', () => {
    const result = grouped(Array.from({ length: 10 }, (_, index) => eventAt(`event-${index}`, 5)))

    expect(result.radiusKm).toBe(10)
    expect(result.nearby).toHaveLength(10)
  })

  it('expands to 25 km and then 50 km to reach the target count', () => {
    const withinTen = Array.from({ length: 9 }, (_, index) => eventAt(`near-${index}`, 5))
    const result25 = grouped([...withinTen, eventAt('at-20', 20)])
    const result50 = grouped([...withinTen, eventAt('at-40', 40)])

    expect(result25.radiusKm).toBe(25)
    expect(result50.radiusKm).toBe(50)
  })

  it('keeps 50 km when fewer than ten events are nearby', () => {
    const result = grouped([
      eventAt('near-1', 5),
      eventAt('near-2', 20),
      eventAt('near-3', 40),
      eventAt('far', 60),
    ])

    expect(result.radiusKm).toBe(50)
    expect(result.nearby.map(item => item.event.id)).toEqual(['near-1', 'near-2', 'near-3'])
    expect(result.other.map(item => item.event.id)).toEqual(['far'])
  })

  it('does not count full events when selecting the radius', () => {
    const open = Array.from({ length: 9 }, (_, index) => eventAt(`open-${index}`, 5))
    const full = eventAt('full', 5, { max_guests: 1, confirmed_count: 1 })
    const result = grouped([...open, full, eventAt('open-at-20', 20)])

    expect(result.radiusKm).toBe(25)
    expect(result.nearby.at(-1)?.event.id).toBe('full')
  })

  it('uses accuracy as a lower-bound correction at the radius edge', () => {
    const events = [
      ...Array.from({ length: 9 }, (_, index) => eventAt(`near-${index}`, 5)),
      eventAt('uncertain-at-12', 12),
    ]
    const result = grouped(events, { ...POSITION, accuracy: 3_000 })

    expect(result.radiusKm).toBe(10)
    expect(result.nearby.some(item => item.event.id === 'uncertain-at-12')).toBe(true)
  })

  it('falls back to a date-only list for missing or low-quality position', () => {
    const events = [
      eventAt('later', 1, { date_start: '2026-07-18T12:00:00Z' }),
      eventAt('sooner', 40, { date_start: '2026-07-16T12:00:00Z' }),
    ]

    const missing = buildPublicEventList(events, undefined, NOW)
    const inaccurate = buildPublicEventList(events, { ...POSITION, accuracy: 25_001 }, NOW)

    expect(missing.mode).toBe('fallback')
    expect(inaccurate.mode).toBe('fallback')
    if (missing.mode === 'fallback') {
      expect(missing.all.map(item => item.event.id)).toEqual(['sooner', 'later'])
    }
  })

  it('sorts available events by date and distance, then full events', () => {
    const result = grouped([
      eventAt('available-later', 2, { date_start: '2026-07-18T12:00:00Z' }),
      eventAt('available-sooner-far', 8, { date_start: '2026-07-16T12:00:00Z' }),
      eventAt('available-sooner-near', 3, { date_start: '2026-07-16T12:00:00Z' }),
      eventAt('full-soonest', 1, {
        date_start: '2026-07-15T13:00:00Z',
        max_guests: 1,
        confirmed_count: 1,
      }),
    ])

    expect(result.nearby.map(item => item.event.id)).toEqual([
      'available-sooner-near',
      'available-sooner-far',
      'available-later',
      'full-soonest',
    ])
  })

  it('puts events without coordinates last in the other section', () => {
    const result = grouped([
      eventAt('without-coordinates', undefined, { date_start: '2026-07-16T12:00:00Z' }),
      eventAt('far-with-coordinates', 70, { date_start: '2026-07-18T12:00:00Z' }),
    ])

    expect(result.other.map(item => item.event.id)).toEqual([
      'far-with-coordinates',
      'without-coordinates',
    ])
  })
})
