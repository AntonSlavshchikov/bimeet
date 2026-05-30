// Синхронизирует бейдж на иконке PWA с числом непрочитанных уведомлений, пока
// приложение открыто (foreground). Фоновую установку бейджа делает service
// worker из push-payload (см. src/sw.ts). UI не рендерит.
import { useEffect } from 'react'
import { useNotifications } from '@/entities/notification/queries'
import { useAuth } from '@/features/auth/model/AuthContext'
import { setBadge } from '@/shared/badge'

// Гейт по авторизации: без юзера не дёргаем /api/notifications (на /login и т.п.).
export function AppBadgeSync() {
  const { user } = useAuth()
  if (!user) return null
  return <BadgeSync />
}

function BadgeSync() {
  // Тот же ключ, что у NotificationCenter — TanStack Query дедуплицирует запрос,
  // лишнего поллинга нет.
  const { data: notifications, refetch } = useNotifications()

  useEffect(() => {
    const unread = (notifications ?? []).filter((n) => !n.is_read).length
    setBadge(unread)
  }, [notifications])

  // При возврате на вкладку подтягиваем свежие данные (вдруг прочитали с другого
  // устройства) → эффект выше скорректирует бейдж.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void refetch()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refetch])

  return null
}
