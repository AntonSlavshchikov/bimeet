import type { EventListItem } from '@/entities/event/model/types'
import type { ProfileStats } from '@/entities/user/model/types'

export const PROFILE_STAT_KEYS = [
  'organized',
  'participated',
  'completed',
  'upcoming',
] as const satisfies readonly (keyof ProfileStats)[]

export type ProfileStatKey = (typeof PROFILE_STAT_KEYS)[number]
export type ProfileStatBaseTab = 'attending' | 'organizing' | 'participated'

const PROFILE_STAT_TABS: Record<ProfileStatKey, ProfileStatBaseTab> = {
  organized: 'organizing',
  participated: 'participated',
  completed: 'participated',
  upcoming: 'attending',
}

export function resolveProfileStat(value: string | null): ProfileStatKey | null {
  return PROFILE_STAT_KEYS.find(key => key === value) ?? null
}

export function profileStatBaseTab(stat: ProfileStatKey): ProfileStatBaseTab {
  return PROFILE_STAT_TABS[stat]
}

export function profileStatHref(stat: ProfileStatKey): string {
  return `/events?tab=${profileStatBaseTab(stat)}&stat=${stat}`
}

export function filterEventsByProfileStat(
  events: EventListItem[],
  stat: ProfileStatKey,
): EventListItem[] {
  return events.filter(event => {
    switch (stat) {
      case 'organized':
        return event.organizer.is_me
      case 'participated':
        return event.status === 'completed' &&
          (event.organizer.is_me || event.my_status === 'confirmed')
      case 'completed':
        return event.organizer.is_me && event.status === 'completed'
      case 'upcoming':
        return event.status === 'active' &&
          !event.organizer.is_me &&
          event.my_status === 'confirmed'
    }
  })
}
