import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/model/AuthContext'
import { PWAUpdater } from '@/shared/pwa/PWAUpdater'
import { AppBadgeSync } from '@/features/notifications/ui/AppBadgeSync'
import type { ReactNode } from 'react'
import '@/shared/i18n'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: ReactNode }) {
  // Тема управляется кастомным стором (@/shared/theme): он тогглит класс `dark`
  // на <html>, а CSS-токены (index.css → html.dark) делают остальное. Раньше
  // здесь стоял next-themes ThemeProvider с forcedTheme="light" — он перехватывал
  // атрибут class на <html> и затирал выбранную тёмную тему, из-за чего выбор не
  // применялся и «сбрасывался» на светлую. Убрано.
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <PWAUpdater />
        <AppBadgeSync />
      </AuthProvider>
    </QueryClientProvider>
  )
}
