import { useEffect, useState } from 'react'
import { distanceKm } from '@/shared/lib/geo'

export interface UserPosition {
  latitude: number
  longitude: number
  accuracy: number
}

export type UserLocationStatus =
  | 'locating'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'

export interface UserLocationState {
  status: UserLocationStatus
  position?: UserPosition
}

const MIN_MOVEMENT_METERS = 1_000
const ACCURACY_IMPROVEMENT_RATIO = 0.7

export function shouldUpdatePosition(current: UserPosition, next: UserPosition): boolean {
  const movedMeters = distanceKm(current, next) * 1000
  const accuracyImproved = next.accuracy <= current.accuracy * ACCURACY_IMPROVEMENT_RATIO
  return movedMeters >= MIN_MOVEMENT_METERS || accuracyImproved
}

function errorStatus(code: number): UserLocationStatus {
  if (code === 1) return 'denied'
  if (code === 3) return 'timeout'
  return 'unavailable'
}

/**
 * Tracks the user's position only while the consuming screen is mounted.
 * Coordinates stay in React memory and are never persisted or sent to the API.
 */
export function useUserLocation(): UserLocationState {
  const [state, setState] = useState<UserLocationState>({ status: 'locating' })

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported' })
      return
    }

    let active = true
    const watchID = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (!active) return
        const nextPosition: UserPosition = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }
        setState(current => {
          const position = current.position && !shouldUpdatePosition(current.position, nextPosition)
            ? current.position
            : nextPosition
          if (current.status === 'ready' && position === current.position) return current
          return { status: 'ready', position }
        })
      },
      error => {
        if (!active) return
        setState(current => ({ ...current, status: errorStatus(error.code) }))
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000,
      },
    )

    return () => {
      active = false
      navigator.geolocation.clearWatch(watchID)
    }
  }, [])

  return state
}
