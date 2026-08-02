import { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSwipeable, type SwipeableHandlers } from 'react-swipeable'

export const primaryNavRoutes = {
  discover: '/discover',
  events: '/events',
  notifications: '/notifications',
  profile: '/profile',
} as const

export const primaryNavOrder = [
  primaryNavRoutes.discover,
  primaryNavRoutes.events,
  primaryNavRoutes.notifications,
  primaryNavRoutes.profile,
] as const

export type PrimaryNavRoute = (typeof primaryNavOrder)[number]
export type PrimarySwipeDirection = 'left' | 'right'

const swipeIgnoreSelector = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="tablist"]',
  '[role="slider"]',
  '[data-swipe-navigation-ignore]',
].join(',')

function normalizePathname(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}

export function isPrimaryNavRoute(pathname: string): boolean {
  return primaryNavOrder.includes(normalizePathname(pathname) as PrimaryNavRoute)
}

export function getAdjacentPrimaryNavRoute(
  pathname: string,
  direction: PrimarySwipeDirection,
): PrimaryNavRoute | undefined {
  const normalized = normalizePathname(pathname)
  const currentIndex = primaryNavOrder.indexOf(normalized as PrimaryNavRoute)
  if (currentIndex === -1) return undefined

  const nextIndex = currentIndex + (direction === 'left' ? 1 : -1)
  return primaryNavOrder[nextIndex]
}

export function shouldIgnorePrimarySwipe(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(swipeIgnoreSelector) !== null
}

interface PrimarySwipeNavigation {
  enabled: boolean
  handlers: SwipeableHandlers
}

export function usePrimarySwipeNavigation(): PrimarySwipeNavigation {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const ignoreCurrentGesture = useRef(false)
  const enabled = isPrimaryNavRoute(pathname)

  function navigateBySwipe(direction: PrimarySwipeDirection) {
    if (ignoreCurrentGesture.current) return
    const destination = getAdjacentPrimaryNavRoute(pathname, direction)
    if (destination) navigate(destination)
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => navigateBySwipe('left'),
    onSwipedRight: () => navigateBySwipe('right'),
    onTouchStartOrOnMouseDown: ({ event }) => {
      ignoreCurrentGesture.current = shouldIgnorePrimarySwipe(event.target)
    },
    onTouchEndOrOnMouseUp: () => {
      ignoreCurrentGesture.current = false
    },
    delta: 50,
    swipeDuration: 500,
    trackTouch: enabled,
    trackMouse: false,
    preventScrollOnSwipe: false,
    touchEventOptions: { passive: true },
  })

  return { enabled, handlers }
}
