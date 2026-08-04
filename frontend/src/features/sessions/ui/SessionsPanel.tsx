import { useState } from 'react'
import { Laptop, Loader2, LogOut, MonitorSmartphone, Smartphone, Tablet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AuthSession } from '@/features/sessions/api'
import { describeUserAgent, type DeviceKind } from '@/features/sessions/model/device'
import { useRevokeOtherSessions, useRevokeSession, useSessions } from '@/features/sessions/model/hooks'
import { useAuth } from '@/features/auth/model/AuthContext'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '@/shared/ui'

type RevokeTarget = AuthSession | 'others' | null

export default function SessionsPanel() {
  const { data: sessions = [], isPending, isError } = useSessions()
  const revokeSession = useRevokeSession()
  const revokeOthers = useRevokeOtherSessions()
  const { clearLocalSession } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const [target, setTarget] = useState<RevokeTarget>(null)
  const otherCount = sessions.filter(session => !session.current).length
  const isRevoking = revokeSession.isPending || revokeOthers.isPending

  function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  async function confirmRevoke() {
    if (!target) return
    try {
      if (target === 'others') {
        await revokeOthers.mutateAsync()
        toast({ title: t('profile.sessionsOthersEnded'), status: 'success' })
      } else {
        await revokeSession.mutateAsync(target.id)
        if (target.current) {
          clearLocalSession()
          navigate('/login', { replace: true })
          return
        }
        toast({ title: t('profile.sessionEnded'), status: 'success' })
      }
      setTarget(null)
    } catch (error) {
      toast({
        title: t('profile.sessionEndError'),
        description: error instanceof Error ? error.message : undefined,
        status: 'error',
      })
    }
  }

  if (isPending) {
    return (
      <div className="flex min-h-40 items-center justify-center text-ink-3">
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  if (isError) {
    return <p className="py-8 text-center text-[13px] text-danger">{t('profile.sessionsLoadError')}</p>
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{t('profile.sessionsTitle')}</h2>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-ink-3">
              {t('profile.sessionsDescription')}
            </p>
          </div>
          {otherCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setTarget('others')}>
              <MonitorSmartphone size={14} />
              {t('profile.endOtherSessions')}
            </Button>
          )}
        </div>

        <div className="overflow-hidden rounded-[14px] border border-line">
          {sessions.map((session, index) => {
            const device = describeUserAgent(session.user_agent)
            const DeviceIcon = deviceIcon(device.kind)
            const browserLabel = device.browser === 'Browser' ? t('profile.unknownBrowser') : device.browser
            const osLabel = device.os === 'Unknown device' ? t('profile.unknownDevice') : device.os
            return (
              <div
                key={session.id}
                className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${index > 0 ? 'border-t border-line-soft' : ''}`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-bg-2 text-ink-2">
                    <DeviceIcon size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">
                        {browserLabel} · {osLabel}
                      </span>
                      {session.current && (
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-success">
                          {t('profile.currentSession')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-ink-3 sm:flex-row sm:gap-3">
                      <span>{t('profile.sessionLastActive', { date: formatTimestamp(session.last_seen_at) })}</span>
                      <span>{t('profile.sessionCreated', { date: formatTimestamp(session.created_at) })}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant={session.current ? 'outline' : 'ghost'}
                  size="sm"
                  className="self-end text-danger sm:self-auto"
                  onClick={() => setTarget(session)}
                >
                  <LogOut size={13} />
                  {session.current ? t('profile.endCurrentSession') : t('profile.endSession')}
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={target != null} onOpenChange={open => { if (!open && !isRevoking) setTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target === 'others' ? t('profile.endOthersDialogTitle') : t('profile.endSessionDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {target === 'others'
                ? t('profile.endOthersDialogBody')
                : target?.current
                  ? t('profile.endCurrentDialogBody')
                  : t('profile.endSessionDialogBody')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={isRevoking}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmRevoke} disabled={isRevoking}>
              {isRevoking && <Loader2 size={13} className="animate-spin" />}
              {t('profile.endSessionConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function deviceIcon(kind: DeviceKind) {
  if (kind === 'mobile') return Smartphone
  if (kind === 'tablet') return Tablet
  return Laptop
}
