import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174, // People dev server занимает 5173
    host: true,
    // Локально компании живут на поддоменах {company}.lvh.me (→ 127.0.0.1).
    allowedHosts: ['.lvh.me', 'localhost'],
  },
})
