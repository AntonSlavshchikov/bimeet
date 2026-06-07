import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useCompany } from '@/features/branding/CompanyProvider'
import { useAuth } from '@/features/auth/AuthContext'
import { FullPageSpinner } from '@/shared/ui'
import Layout from '@/widgets/layout'
import LoginPage from '@/pages/login'
import RegisterCompanyPage from '@/pages/register-company'
import AcceptInvitePage from '@/pages/accept-invite'
import CompanyNotFoundPage from '@/pages/company-not-found'
import EventsListPage from '@/pages/events-list'
import EventFormPage from '@/pages/event-form'
import EventDetailPage from '@/pages/event-detail'
import NotificationsPage from '@/pages/notifications'
import SettingsPage from '@/pages/settings'
import TeamPage from '@/pages/team'

export default function AppRouter() {
  const { subdomain, loading: companyLoading, notFound } = useCompany()
  const { token, user, loading: authLoading } = useAuth()

  // Registration host (company.* / bare): only the sign-up flow lives here.
  if (subdomain === null) {
    return (
      <Routes>
        <Route path="/" element={<RegisterCompanyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  if (companyLoading || authLoading) return <FullPageSpinner />
  if (notFound) return <CompanyNotFoundPage />

  // Company workspace — gated by the password session.
  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const isOwner = user?.role === 'owner'

  return (
    <Routes>
      <Route
        element={
          <Layout>
            <Outlet />
          </Layout>
        }
      >
        <Route path="/" element={<EventsListPage />} />
        <Route path="/events/new" element={<EventFormPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/events/:id/edit" element={<EventFormPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        {isOwner && <Route path="/team" element={<TeamPage />} />}
        {isOwner && <Route path="/settings" element={<SettingsPage />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
