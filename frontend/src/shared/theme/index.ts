import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'

// Тема оформления на Zustand+persist. Resolved-режим применяется классом `dark`
// на <html>; CSS-токены (index.css → html.dark) делают остальное.
export type Theme = 'light' | 'dark'

// Тему храним в сыром ключе localStorage 'theme' ('light'/'dark') — тот же ключ
// читает инлайн-бутстрап в index.html (вешает класс до первой отрисовки, чтобы
// не было мигания). Кастомное storage держит значение сырым, без JSON-обёртки.
const themeStorage: StateStorage = {
  getItem: (name) => {
    const v = localStorage.getItem(name)
    return v ? JSON.stringify({ state: { theme: v }, version: 0 }) : null
  },
  setItem: (name, value) => {
    const { state } = JSON.parse(value) as { state: { theme: Theme } }
    localStorage.setItem(name, state.theme)
  },
  removeItem: (name) => localStorage.removeItem(name),
}

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
}

function applyClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme',
      storage: createJSONStorage(() => themeStorage),
    },
  ),
)

// Применяем класс на загрузке (после гидратации persist) и на каждое изменение.
applyClass(useThemeStore.getState().theme)
useThemeStore.subscribe((s) => applyClass(s.theme))

/** Реактивная тема + сеттер. Сигнатура сохранена для совместимости. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  return [theme, setTheme]
}
