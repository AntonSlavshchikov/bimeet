import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SwipeableProps, SwipeEventData } from 'react-swipeable'
import {
  getAdjacentPrimaryNavRoute,
  isPrimaryNavRoute,
  primaryNavOrder,
  shouldIgnorePrimarySwipe,
  usePrimarySwipeNavigation,
} from './primary-navigation'

const swipeableMock = vi.hoisted(() => ({
  useSwipeable: vi.fn(),
}))

vi.mock('react-swipeable', () => ({
  useSwipeable: swipeableMock.useSwipeable,
}))

function SwipeHarness() {
  const location = useLocation()
  usePrimarySwipeNavigation()

  return (
    <div
      data-enabled={String(isPrimaryNavRoute(location.pathname))}
      data-pathname={location.pathname}
    />
  )
}

describe('primary navigation route model', () => {
  it('uses the same ordered roots as the primary app navigation', () => {
    expect(primaryNavOrder).toEqual([
      '/discover',
      '/events',
      '/chats',
      '/profile',
    ])
  })

  it('resolves adjacent routes without wrapping at the boundaries', () => {
    expect(getAdjacentPrimaryNavRoute('/discover', 'left')).toBe('/events')
    expect(getAdjacentPrimaryNavRoute('/events', 'right')).toBe('/discover')
    expect(getAdjacentPrimaryNavRoute('/chats', 'left')).toBe('/profile')
    expect(getAdjacentPrimaryNavRoute('/profile', 'left')).toBeUndefined()
    expect(getAdjacentPrimaryNavRoute('/discover', 'right')).toBeUndefined()
  })

  it('accepts trailing slashes but rejects nested routes', () => {
    expect(isPrimaryNavRoute('/events/')).toBe(true)
    expect(getAdjacentPrimaryNavRoute('/events/', 'left')).toBe('/chats')
    expect(isPrimaryNavRoute('/events/123')).toBe(false)
    expect(getAdjacentPrimaryNavRoute('/events/123', 'right')).toBeUndefined()
  })

  it('ignores form controls, horizontal tabs, sliders, and explicit opt-outs', () => {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = `
      <input />
      <div role="tablist"><button type="button">Tab</button></div>
      <div role="slider"><span>Thumb</span></div>
      <div contenteditable="true"><span>Edit</span></div>
      <div data-swipe-navigation-ignore><a href="#">Ignore</a></div>
      <article>Content</article>
    `

    expect(shouldIgnorePrimarySwipe(wrapper.querySelector('input'))).toBe(true)
    expect(shouldIgnorePrimarySwipe(wrapper.querySelector('[role="tablist"] button'))).toBe(true)
    expect(shouldIgnorePrimarySwipe(wrapper.querySelector('[role="slider"] span'))).toBe(true)
    expect(shouldIgnorePrimarySwipe(wrapper.querySelector('[contenteditable] span'))).toBe(true)
    expect(shouldIgnorePrimarySwipe(wrapper.querySelector('[data-swipe-navigation-ignore] a'))).toBe(true)
    expect(shouldIgnorePrimarySwipe(wrapper.querySelector('article'))).toBe(false)
  })
})

describe('usePrimarySwipeNavigation', () => {
  let container: HTMLDivElement
  let root: Root
  let latestOptions: SwipeableProps | undefined

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    latestOptions = undefined
    swipeableMock.useSwipeable.mockImplementation((options: SwipeableProps) => {
      latestOptions = options
      return { ref: vi.fn() }
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    swipeableMock.useSwipeable.mockReset()
  })

  async function renderAt(pathname: string) {
    await act(async () => root.render(
      <MemoryRouter initialEntries={[pathname]}>
        <SwipeHarness />
      </MemoryRouter>,
    ))
  }

  function fireSwipe(direction: 'left' | 'right') {
    const callback = direction === 'left' ? latestOptions?.onSwipedLeft : latestOptions?.onSwipedRight
    callback?.({} as SwipeEventData)
  }

  it('configures a passive touch-only gesture on root routes', async () => {
    await renderAt('/events')

    expect(container.firstElementChild?.getAttribute('data-enabled')).toBe('true')
    expect(latestOptions).toMatchObject({
      delta: 50,
      swipeDuration: 500,
      trackTouch: true,
      trackMouse: false,
      preventScrollOnSwipe: false,
      touchEventOptions: { passive: true },
    })
  })

  it('navigates left and right between adjacent root routes', async () => {
    await renderAt('/events')

    await act(async () => fireSwipe('left'))
    expect(container.firstElementChild?.getAttribute('data-pathname')).toBe('/chats')

    await act(async () => fireSwipe('right'))
    expect(container.firstElementChild?.getAttribute('data-pathname')).toBe('/events')
  })

  it('does not attach touch tracking on nested routes', async () => {
    await renderAt('/events/123')

    expect(container.firstElementChild?.getAttribute('data-enabled')).toBe('false')
    expect(latestOptions?.trackTouch).toBe(false)

    await act(async () => fireSwipe('left'))
    expect(container.firstElementChild?.getAttribute('data-pathname')).toBe('/events/123')
  })

  it('ignores a gesture started on a control and resets for the next gesture', async () => {
    await renderAt('/events')
    const input = document.createElement('input')

    latestOptions?.onTouchStartOrOnMouseDown?.({ event: { target: input } as unknown as TouchEvent })
    await act(async () => fireSwipe('left'))
    expect(container.firstElementChild?.getAttribute('data-pathname')).toBe('/events')

    latestOptions?.onTouchEndOrOnMouseUp?.({ event: { target: input } as unknown as TouchEvent })
    latestOptions?.onTouchStartOrOnMouseDown?.({ event: { target: container } as unknown as TouchEvent })
    await act(async () => fireSwipe('left'))
    expect(container.firstElementChild?.getAttribute('data-pathname')).toBe('/chats')
  })
})
