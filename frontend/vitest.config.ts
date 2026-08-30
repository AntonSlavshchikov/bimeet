import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Конфиг тестов отдельно от vite.config.ts, чтобы не тащить в сборку
// PWA/tailwind-плагины. Переиспользуем только алиас '@' → src.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    // Фиксируем таймзону, чтобы тесты форматирования дат были детерминированы
    // независимо от машины/CI.
    env: { TZ: 'UTC' },
  },
})
