import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/features/auth/ui/ProtectedRoute'
import AdminRoute from '@/features/auth/ui/AdminRoute'
import Layout from '@/widgets/layout'
import LoginPage from '@/pages/login'
import EventsListPage, { EventsListRail } from '@/pages/events-list'
import PublicEventsPage from '@/pages/public-events'
import EventDetailPage from '@/pages/event-detail'
import EventFormPage from '@/pages/event-form'
import ChatsPage from '@/pages/chats'
import InvitePage from '@/pages/invite'
import ProfilePage from '@/pages/profile'
import NotificationsPage from '@/pages/notifications'
import AdminPanelPage from '@/pages/admin-panel'
import DesignSystemPage from '@/pages/_design-system'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/discover" replace />} />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Layout rail={<EventsListRail />}>
                <EventsListPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <Layout>
                <PublicEventsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/new"
          element={
            <ProtectedRoute>
              <Layout>
                <EventFormPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <Layout rail={<EventsListRail />}>
                <EventDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <EventFormPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chats"
          element={
            <ProtectedRoute>
              <Layout>
                <ChatsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chats/:eventId"
          element={
            <ProtectedRoute>
              <Layout>
                <ChatsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <NotificationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Layout>
                <AdminPanelPage />
              </Layout>
            </AdminRoute>
          }
        />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/_design-system" element={<Layout><DesignSystemPage /></Layout>} />
        <Route path="*" element={<Navigate to="/discover" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
