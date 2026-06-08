import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useCompany } from '@/features/branding/CompanyProvider'
import { BrandScope } from '@/features/branding/BrandScope'
import { useAuth } from '@/features/auth/AuthContext'
import { FullPageSpinner } from '@/shared/ui'
import Layout from '@/widgets/layout'
import PageScroll from '@/widgets/layout/PageScroll'
import LoginPage from '@/pages/login'
import RegisterCompanyPage from '@/pages/register-company'
import AcceptInvitePage from '@/pages/accept-invite'
import CompanyNotFoundPage from '@/pages/company-not-found'
import MeetingsLayout from '@/pages/meetings'
import EmptyDetail from '@/pages/meetings/EmptyDetail'
import EventDetailPanel from '@/pages/event-detail'
import EventFormPage from '@/pages/event-form'
import NotificationsPage from '@/pages/notifications'
import SettingsPage from '@/pages/settings'
import TeamPage from '@/pages/team'

export default function AppRouter() {
  const { subdomain, company: publicCompany, loading: companyLoading, notFound } = useCompany()
  const { token, user, company: authCompany, loading: authLoading } = useAuth()

  // Effective brand: the authed company (reflects owner edits) takes precedence
  // over the public brand used pre-login. Scoped to the company-context subtree.
  const brandColor = authCompany?.brand_color ?? publicCompany?.brand_color ?? null

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
      <BrandScope color={brandColor}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrandScope>
    )
  }

  const isOwner = user?.role === 'owner'

  return (
    <BrandScope color={brandColor}>
    <Routes>
      <Route
        element={
          <Layout>
            <Outlet />
          </Layout>
        }
      >
        {/* Meetings master-detail: list column + detail panel share one layout. */}
        <Route element={<MeetingsLayout />}>
          <Route path="/" element={<EmptyDetail />} />
          <Route path="/events/:id" element={<EventDetailPanel />} />
        </Route>

        <Route path="/events/new" element={<PageScroll><EventFormPage /></PageScroll>} />
        <Route path="/events/:id/edit" element={<PageScroll><EventFormPage /></PageScroll>} />
        <Route path="/notifications" element={<PageScroll><NotificationsPage /></PageScroll>} />
        {isOwner && <Route path="/team" element={<PageScroll><TeamPage /></PageScroll>} />}
        {isOwner && <Route path="/settings" element={<PageScroll><SettingsPage /></PageScroll>} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </BrandScope>
  )
}
