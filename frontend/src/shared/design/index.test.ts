import { beforeEach, describe, expect, it, vi } from 'vitest'

async function freshDesign() {
  vi.resetModules()
  return import('./index')
}

describe('design store (Zustand + persist)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses modern by default', async () => {
    const { useDesignStore } = await freshDesign()

    expect(useDesignStore.getState().design).toBe('modern')
  })

  it('hydrates dashboard from localStorage', async () => {
    localStorage.setItem('design', 'dashboard')

    const { useDesignStore } = await freshDesign()

    expect(useDesignStore.getState().design).toBe('dashboard')
  })

  it('persists design changes in localStorage', async () => {
    const { useDesignStore } = await freshDesign()

    useDesignStore.getState().setDesign('dashboard')
    expect(localStorage.getItem('design')).toBe('dashboard')

    useDesignStore.getState().setDesign('modern')
    expect(localStorage.getItem('design')).toBe('modern')
  })

  it('falls back to modern for an unknown stored value', async () => {
    localStorage.setItem('design', 'unknown')

    const { useDesignStore } = await freshDesign()

    expect(useDesignStore.getState().design).toBe('modern')
  })
})
