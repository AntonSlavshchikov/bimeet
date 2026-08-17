import { describe, expect, it } from 'vitest'
import { clampSwipeOffset, resolveSwipeRestingOffset } from './model/swipe'

describe('event list row swipe', () => {
  it('keeps the dragged row inside the action rail', () => {
    expect(clampSwipeOffset(-220, 176)).toBe(-176)
    expect(clampSwipeOffset(24, 176)).toBe(0)
    expect(clampSwipeOffset(-70, 176)).toBe(-70)
  })

  it('opens after crossing half of the action rail', () => {
    expect(resolveSwipeRestingOffset({
      startOffset: 0,
      deltaX: -100,
      velocity: 0.2,
      actionWidth: 176,
    })).toBe(-176)
  })

  it('uses swipe direction for a fast gesture', () => {
    expect(resolveSwipeRestingOffset({
      startOffset: 0,
      deltaX: -30,
      velocity: 0.5,
      actionWidth: 176,
    })).toBe(-176)
    expect(resolveSwipeRestingOffset({
      startOffset: -176,
      deltaX: 30,
      velocity: 0.5,
      actionWidth: 176,
    })).toBe(0)
  })
})
