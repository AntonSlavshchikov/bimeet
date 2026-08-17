import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserLocation, type UserLocationState } from './useUserLocation'

describe('useUserLocation', () => {
  let container: HTMLDivElement
  let root: Root
  let successCallback: PositionCallback | undefined
  let errorCallback: PositionErrorCallback | null | undefined
  const clearWatch = vi.fn()

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    successCallback = undefined
    errorCallback = undefined
    clearWatch.mockReset()

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((success: PositionCallback, error?: PositionErrorCallback | null) => {
          successCallback = success
          errorCallback = error
          return 42
        }),
        clearWatch,
      },
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('starts watching, exposes updates, and clears the watch on unmount', async () => {
    const states: UserLocationState[] = []

    function Probe() {
      const state = useUserLocation()
      useEffect(() => {
        states.push(state)
      }, [state])
      return null
    }

    await act(async () => root.render(<Probe />))
    expect(navigator.geolocation.watchPosition).toHaveBeenCalledOnce()

    await act(async () => successCallback?.({
      coords: {
        latitude: 55.751244,
        longitude: 37.618423,
        accuracy: 25,
      },
    } as GeolocationPosition))

    expect(states.at(-1)).toEqual({
      status: 'ready',
      position: {
        latitude: 55.751244,
        longitude: 37.618423,
        accuracy: 25,
      },
    })

    await act(async () => root.unmount())
    expect(clearWatch).toHaveBeenCalledWith(42)
    root = createRoot(container)
  })

  it('maps a rejected permission to the denied state', async () => {
    const states: UserLocationState[] = []

    function Probe() {
      const state = useUserLocation()
      useEffect(() => {
        states.push(state)
      }, [state])
      return null
    }

    await act(async () => root.render(<Probe />))
    await act(async () => errorCallback?.({ code: 1 } as GeolocationPositionError))

    expect(states.at(-1)?.status).toBe('denied')
  })

  it('ignores GPS noise and accepts meaningful movement', async () => {
    const states: UserLocationState[] = []

    function Probe() {
      const state = useUserLocation()
      useEffect(() => {
        states.push(state)
      }, [state])
      return null
    }

    await act(async () => root.render(<Probe />))
    await act(async () => successCallback?.({
      coords: { latitude: 0, longitude: 0, accuracy: 100 },
    } as GeolocationPosition))
    await act(async () => successCallback?.({
      coords: { latitude: 0.0005, longitude: 0, accuracy: 100 },
    } as GeolocationPosition))

    expect(states).toHaveLength(2)
    expect(states.at(-1)?.position?.latitude).toBe(0)

    await act(async () => successCallback?.({
      coords: { latitude: 0.01, longitude: 0, accuracy: 100 },
    } as GeolocationPosition))

    expect(states).toHaveLength(3)
    expect(states.at(-1)?.position?.latitude).toBe(0.01)
  })

  it('accepts a position whose accuracy improves by at least thirty percent', async () => {
    const states: UserLocationState[] = []

    function Probe() {
      const state = useUserLocation()
      useEffect(() => {
        states.push(state)
      }, [state])
      return null
    }

    await act(async () => root.render(<Probe />))
    await act(async () => successCallback?.({
      coords: { latitude: 0, longitude: 0, accuracy: 100 },
    } as GeolocationPosition))
    await act(async () => successCallback?.({
      coords: { latitude: 0.0005, longitude: 0, accuracy: 70 },
    } as GeolocationPosition))

    expect(states.at(-1)?.position).toEqual({
      latitude: 0.0005,
      longitude: 0,
      accuracy: 70,
    })
  })
})
