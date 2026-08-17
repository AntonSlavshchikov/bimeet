import { describe, expect, it } from 'vitest'
import { distanceKm } from './geo'

describe('distanceKm', () => {
  it('returns zero for the same point', () => {
    const point = { latitude: 55.751244, longitude: 37.618423 }
    expect(distanceKm(point, point)).toBe(0)
  })

  it('calculates a known great-circle distance', () => {
    const moscow = { latitude: 55.751244, longitude: 37.618423 }
    const saintPetersburg = { latitude: 59.938784, longitude: 30.314997 }

    expect(distanceKm(moscow, saintPetersburg)).toBeGreaterThan(630)
    expect(distanceKm(moscow, saintPetersburg)).toBeLessThan(640)
  })
})
