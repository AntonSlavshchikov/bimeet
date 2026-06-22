import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PWAUpdater } from '@/shared/pwa/PWAUpdater'
import { AppBadgeSync } from '@/features/notifications/ui/AppBadgeSync'
import type { ReactNode } from 'react'
import '@/shared/i18n'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: ReactNode }) {
  // Клиентский стейт — на Zustand+persist: auth (@/features/auth/model/AuthContext)
  // и тема (@/shared/theme). Провайдеры им не нужны. Серверный стейт — TanStack Query.
  // Тема тогглит класс `dark` на <html>, CSS-токены (index.css → html.dark) делают
  // остальное.
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <PWAUpdater />
      <AppBadgeSync />
    </QueryClientProvider>
  )
}
