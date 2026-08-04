import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDesignStore, type Design } from '@/shared/design'
import Layout from './index'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}))
vi.mock('./Sidebar', () => ({ default: () => null }))
vi.mock('./BottomNav', () => ({ default: () => null }))
vi.mock('@/features/notifications/ui/NotificationsNavbarActions', () => ({ default: () => null }))
vi.mock('./model/primary-navigation', () => ({
  usePrimarySwipeNavigation: () => ({ handlers: {} }),
}))

describe('Layout design variants', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear()
    useDesignStore.getState().setDesign('modern')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  async function renderShell(design: Design) {
    useDesignStore.getState().setDesign(design)
    await act(async () => root.render(
      <MemoryRouter>
        <Layout>Content</Layout>
      </MemoryRouter>,
    ))

    const outer = container.firstElementChild as HTMLElement
    const shell = outer.firstElementChild as HTMLElement
    return { outer, shell }
  }

  it('renders modern as a full-screen shell', async () => {
    const { outer, shell } = await renderShell('modern')

    expect(outer.classList.contains('p-3')).toBe(false)
    expect(outer.getAttribute('style')).toBeNull()
    expect(shell.classList.contains('rounded-[20px]')).toBe(false)
    expect(shell.classList.contains('app-shell-shadow')).toBe(false)
  })

  it('renders dashboard as an inset floating shell', async () => {
    const { outer, shell } = await renderShell('dashboard')

    expect(outer.classList.contains('justify-center')).toBe(true)
    expect(outer.classList.contains('p-3')).toBe(true)
    expect(outer.classList.contains('lg:p-5')).toBe(true)
    expect(outer.style.background).toContain('radial-gradient')
    expect(shell.classList.contains('app-shell-shadow')).toBe(true)
    expect(shell.classList.contains('rounded-[20px]')).toBe(true)
    expect(shell.classList.contains('border')).toBe(true)
    expect(shell.classList.contains('border-line')).toBe(true)
  })
})
