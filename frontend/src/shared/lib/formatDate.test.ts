import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, formatDateTime } from './formatDate'

// TZ зафиксирована в vitest.config.ts (UTC), поэтому значения времени стабильны.
describe('formatDate утилиты (ru-RU)', () => {
  it('formatDate — день, месяц прописью и год', () => {
    const s = formatDate('2024-03-08T12:00:00Z')
    expect(s).toContain('8')
    expect(s).toContain('марта')
    expect(s).toContain('2024')
  })

  it('formatTime — HH:MM', () => {
    expect(formatTime('2024-03-08T09:05:00Z')).toBe('09:05')
  })

  it('formatDateTime — короткий месяц + время', () => {
    const s = formatDateTime('2024-03-08T09:05:00Z')
    expect(s).toContain('09:05')
    expect(s).toMatch(/мар/i)
  })
})
