import { useSyncExternalStore } from 'react'

// Theme preference. The resolved mode is applied as a `dark` class on <html>;
// CSS token overrides (index.css) do the rest. Persisted in localStorage.
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const listeners = new Set<() => void>()

let current: Theme = readStored()

function readStored(): Theme {
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

function apply() {
  document.documentElement.classList.toggle('dark', current === 'dark')
}

function getTheme(): Theme {
  return current
}

export function setTheme(theme: Theme) {
  current = theme
  localStorage.setItem(STORAGE_KEY, theme)
  apply()
  listeners.forEach(l => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

// Apply on module load so the class is set before first paint.
apply()

/** Reactive theme preference + setter. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getTheme, getTheme)
  return [theme, setTheme]
}
