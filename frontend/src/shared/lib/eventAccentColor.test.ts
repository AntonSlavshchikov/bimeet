import { describe, it, expect } from 'vitest'
import { eventAccentColor } from './eventAccentColor'

const PALETTE = ['red', 'green', 'purple', 'indigo']

describe('eventAccentColor', () => {
  it('completed → gray (приоритет над public)', () => {
    expect(eventAccentColor({ id: 'x', status: 'completed', is_public: true })).toBe('gray')
  })

  it('public → orange', () => {
    expect(eventAccentColor({ id: 'x', is_public: true })).toBe('orange')
  })

  it('private → цвет из палитры red/green/purple/indigo', () => {
    expect(PALETTE).toContain(eventAccentColor({ id: 'abc' }))
  })

  it('детерминирован: один id → один цвет', () => {
    expect(eventAccentColor({ id: 'event-42' })).toBe(eventAccentColor({ id: 'event-42' }))
  })

  it('не падает на пустом id и остаётся в палитре', () => {
    expect(PALETTE).toContain(eventAccentColor({ id: '' }))
  })
})
