import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

export type Design = 'modern' | 'dashboard'

function isDesign(value: string | null): value is Design {
  return value === 'modern' || value === 'dashboard'
}

// Храним выбранный дизайн сырым значением в localStorage, как и цветовую тему.
// Неизвестное значение игнорируется, чтобы приложение безопасно вернулось к modern.
const designStorage: StateStorage = {
  getItem: (name) => {
    const value = localStorage.getItem(name)
    return isDesign(value)
      ? JSON.stringify({ state: { design: value }, version: 0 })
      : null
  },
  setItem: (name, value) => {
    const { state } = JSON.parse(value) as { state: { design: Design } }
    localStorage.setItem(name, state.design)
  },
  removeItem: (name) => localStorage.removeItem(name),
}

interface DesignState {
  design: Design
  setDesign: (design: Design) => void
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set) => ({
      design: 'modern',
      setDesign: (design) => set({ design }),
    }),
    {
      name: 'design',
      storage: createJSONStorage(() => designStorage),
    },
  ),
)

export function useDesign(): [Design, (design: Design) => void] {
  const design = useDesignStore((state) => state.design)
  const setDesign = useDesignStore((state) => state.setDesign)
  return [design, setDesign]
}
