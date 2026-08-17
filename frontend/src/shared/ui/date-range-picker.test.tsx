import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DateRangePicker } from './date-range-picker'

describe('DateRangePicker', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('disables dates before the minimum and selects a one-day event in one click', async () => {
    const onChange = vi.fn()
    await act(async () => root.render(
      <DateRangePicker
        startDate="2026-08-01"
        onChange={onChange}
        placeholder="Select a date"
        clearLabel="Clear dates"
        previousMonthLabel="Previous month"
        nextMonthLabel="Next month"
        locale="en-US"
        minDate="2026-08-01"
        selectionMode="single"
      />,
    ))

    const trigger = container.querySelector<HTMLButtonElement>('button')
    expect(trigger).not.toBeNull()
    await act(async () => trigger?.click())

    const previousDay = document.body.querySelector<HTMLButtonElement>('[aria-label="July 31, 2026"]')
    const availableDay = document.body.querySelector<HTMLButtonElement>('[aria-label="August 2, 2026"]')
    expect(previousDay?.disabled).toBe(true)
    expect(availableDay?.disabled).toBe(false)

    await act(async () => availableDay?.click())
    expect(onChange).toHaveBeenCalledWith({ startDate: '2026-08-02', endDate: '2026-08-02' })
  })

  it('opens at the minimum date when the saved event date is in the past', async () => {
    await act(async () => root.render(
      <DateRangePicker
        startDate="2025-01-10"
        endDate="2025-01-10"
        onChange={() => undefined}
        placeholder="Select a date"
        clearLabel="Clear dates"
        previousMonthLabel="Previous month"
        nextMonthLabel="Next month"
        locale="en-US"
        minDate="2026-08-01"
        selectionMode="single"
      />,
    ))

    const trigger = container.querySelector<HTMLButtonElement>('button')
    await act(async () => trigger?.click())

    expect(document.body.textContent).toContain('August 2026')
    expect(document.body.textContent).not.toContain('January 2025')
  })
})
