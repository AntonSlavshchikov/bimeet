import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CompanyProvider } from '@/features/branding/CompanyProvider'
import { AuthProvider } from '@/features/auth/AuthContext'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CompanyProvider>
        <AuthProvider>{children}</AuthProvider>
      </CompanyProvider>
    </QueryClientProvider>
  )
}
