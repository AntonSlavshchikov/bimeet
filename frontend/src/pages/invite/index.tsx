import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Loader2, MapPin, Users } from 'lucide-react'
import { apiFetch } from '@/shared/api/client'
import { useAuth } from '@/features/auth/model/AuthContext'
import type { InviteEventInfo } from '@/entities/event/model/types'
import { formatDate, formatTime } from '@/shared/lib/formatDate'
import AuthShell from '@/features/auth/ui/AuthShell'
import { Button, useToast } from '@/shared/ui'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()

  const [event, setEvent] = useState<InviteEventInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    apiFetch<InviteEventInfo>(`/api/events/invite/${token}`)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setLoading(false))
  }, [token])

  async function handleJoin() {
    setJoining(true)
    try {
      const participant = await apiFetch<{ event_id: string }>(`/api/events/invite/${token}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'join' }),
      })
      navigate(`/events/${participant.event_id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка'
      toast({ title: msg, status: 'error' })
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="text-ink-3 animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <AuthShell title={t('invite.invalidTitle', 'Приглашение недоступно')} subtitle={t('invite.invalidSubtitle', 'Ссылка устарела или была отозвана организатором.')}>
        <Button asChild className="w-full">
          <Link to="/events">{t('common.home', 'На главную')}</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('invite.badge', 'Вас приглашают')} subtitle={event.title}>
      {event.description && (
        <p className="text-[13.5px] text-ink-2 leading-[1.5] -mt-2">{event.description}</p>
      )}

      <div className="flex flex-col gap-2">
        <Meta icon={Calendar}>{formatDate(event.date_start)}, {formatTime(event.date_start)}</Meta>
        <Meta icon={MapPin}>{event.location}</Meta>
        <Meta icon={Users}>
          {t('invite.confirmedCount', { count: event.confirmed_count, defaultValue: `${event.confirmed_count} уже подтвердили` })}
        </Meta>
      </div>

      {event.organizer && (
        <div className="text-[12px] text-ink-3">
          {t('invite.organizer', 'Организатор:')} <span className="font-semibold text-ink-2">{event.organizer.name}</span>
        </div>
      )}

      {user ? (
        <Button className="w-full" onClick={handleJoin} disabled={joining}>
          {joining ? '…' : t('invite.joinButton', 'Принять приглашение')}
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link to={`/register?token=${token}`}>{t('invite.registerAndAccept', 'Зарегистрироваться и принять')}</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to={`/login?token=${token}`}>{t('invite.signIn', 'Войти')}</Link>
          </Button>
        </div>
      )}
    </AuthShell>
  )
}

function Meta({ icon: Icon, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[13.5px] text-ink-2 leading-[1.5]">
      <Icon size={14} className="text-ink-3 shrink-0 mt-0.5" />
      <span className="min-w-0">{children}</span>
    </div>
  )
}
