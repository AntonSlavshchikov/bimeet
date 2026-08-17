export function clampSwipeOffset(offset: number, actionWidth: number): number {
  return Math.max(-actionWidth, Math.min(0, offset))
}

export function resolveSwipeRestingOffset({
  startOffset,
  deltaX,
  velocity,
  actionWidth,
}: {
  startOffset: number
  deltaX: number
  velocity: number
  actionWidth: number
}): number {
  const currentOffset = clampSwipeOffset(startOffset + deltaX, actionWidth)
  const shouldOpen = velocity > 0.35
    ? deltaX < 0
    : Math.abs(currentOffset) >= actionWidth / 2
  return shouldOpen ? -actionWidth : 0
}
