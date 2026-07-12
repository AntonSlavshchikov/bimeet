function createStorage(): Storage {
  let values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values = new Map()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, String(value))
    },
  }
}

const localStorageMock = createStorage()
const sessionStorageMock = createStorage()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: localStorageMock,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: sessionStorageMock,
})

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  configurable: true,
  value: sessionStorageMock,
})
