import type { PublicEventListItem } from '@/entities/event/model/types'
import { distanceKm } from '@/shared/lib/geo'
import type { UserPosition } from './useUserLocation'

export const NEARBY_RADII_KM = [10, 25, 50] as const
export const TARGET_NEARBY_EVENTS = 10
export const MAX_USABLE_ACCURACY_METERS = 25_000

export interface RankedPublicEvent {
  event: PublicEventListItem
  distanceKm?: number
}

export type PublicEventList =
  | { mode: 'fallback'; all: RankedPublicEvent[] }
  | { mode: 'grouped'; radiusKm: number; nearby: RankedPublicEvent[]; other: RankedPublicEvent[] }

function hasAvailableSpot(event: PublicEventListItem): boolean {
  return event.max_guests == null || event.confirmed_count < event.max_guests
}

function compareStartDate(a: RankedPublicEvent, b: RankedPublicEvent): number {
  return new Date(a.event.date_start).getTime() - new Date(b.event.date_start).getTime()
}

function compareRanked(a: RankedPublicEvent, b: RankedPublicEvent, missingLast: boolean): number {
  const availabilityDelta = Number(!hasAvailableSpot(a.event)) - Number(!hasAvailableSpot(b.event))
  if (availabilityDelta) return availabilityDelta

  if (missingLast) {
    const missingDelta = Number(a.distanceKm == null) - Number(b.distanceKm == null)
    if (missingDelta) return missingDelta
  }

  const dateDelta = compareStartDate(a, b)
  if (dateDelta) return dateDelta

  const distanceDelta = (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
  return distanceDelta || a.event.id.localeCompare(b.event.id)
}

export function buildPublicEventList(
  events: PublicEventListItem[],
  position?: UserPosition,
  now = Date.now(),
): PublicEventList {
  const upcoming = events.filter(
    event => event.status !== 'completed' && new Date(event.date_end).getTime() >= now,
  )

  if (!position || position.accuracy > MAX_USABLE_ACCURACY_METERS) {
    return {
      mode: 'fallback',
      all: upcoming
        .map(event => ({ event }))
        .sort((a, b) => compareStartDate(a, b) || a.event.id.localeCompare(b.event.id)),
    }
  }

  const accuracyKm = position.accuracy / 1000
  const ranked = upcoming.map<RankedPublicEvent>(event => {
    if (event.location_lat == null || event.location_lng == null) return { event }
    return {
      event,
      distanceKm: distanceKm(position, {
        latitude: event.location_lat,
        longitude: event.location_lng,
      }),
    }
  })

  const radiusKm = NEARBY_RADII_KM.find(radius => {
    const availableCount = ranked.filter(item =>
      hasAvailableSpot(item.event) &&
      item.distanceKm != null &&
      Math.max(0, item.distanceKm - accuracyKm) <= radius,
    ).length
    return availableCount >= TARGET_NEARBY_EVENTS
  }) ?? NEARBY_RADII_KM.at(-1)!

  const nearby: RankedPublicEvent[] = []
  const other: RankedPublicEvent[] = []
  for (const item of ranked) {
    if (item.distanceKm != null && Math.max(0, item.distanceKm - accuracyKm) <= radiusKm) {
      nearby.push(item)
    } else {
      other.push(item)
    }
  }

  nearby.sort((a, b) => compareRanked(a, b, false))
  other.sort((a, b) => compareRanked(a, b, true))

  return { mode: 'grouped', radiusKm, nearby, other }
}
