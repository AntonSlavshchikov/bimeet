import { describe, it, expect, beforeEach, vi } from 'vitest'

// Тема: защита от ровно того бага, что чинили — выбор должен применяться классом
// `dark` на <html> и сохраняться. Стор гидратируется при импорте модуля, поэтому
// каждый тест берёт свежий модуль.
async function freshTheme() {
  vi.resetModules()
  return import('./index')
}

describe('theme store (Zustand + persist)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('по умолчанию light, класс dark не висит', async () => {
    const { useThemeStore } = await freshTheme()

    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('гидратирует dark из localStorage и вешает класс на <html>', async () => {
    localStorage.setItem('theme', 'dark')

    const { useThemeStore } = await freshTheme()

    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme переключает класс и пишет в localStorage', async () => {
    const { useThemeStore } = await freshTheme()

    useThemeStore.getState().setTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')

    useThemeStore.getState().setTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
