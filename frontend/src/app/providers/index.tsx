import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/features/auth/model/AuthContext'
import { PWAUpdater } from '@/shared/pwa/PWAUpdater'
import { AppBadgeSync } from '@/features/notifications/ui/AppBadgeSync'
import type { ReactNode } from 'react'
import '@/shared/i18n'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <PWAUpdater />
          <AppBadgeSync />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
