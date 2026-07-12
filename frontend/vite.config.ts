import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Свой service worker (src/sw.ts) — нужен для обработчиков push / notificationclick.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Авто-обновление: новый SW активируется и перехватывает управление сам
      // (см. skipWaiting + clientsClaim в src/sw.ts), без ручного «Обновить».
      registerType: 'autoUpdate',
      // SW регистрируем вручную через workbox-window в PWAUpdater.tsx
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bimeet',
        short_name: 'Bimeet',
        description: 'Организация встреч: события, сборы, опросы, попутчики',
        theme_color: '#0a0a0b',
        background_color: '#0a0a0b',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png}'],
        // iOS splash-картинки грузятся напрямую по <link> в index.html —
        // в precache SW они не нужны и только раздувают объём установки.
        globIgnores: ['**/splash/**'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
