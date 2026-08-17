import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button, useToast } from '@/shared/ui'
import {
  getPushState,
  isPushEnabled,
  enablePush,
  disablePush,
  sendTestPush,
  type PushState,
} from '@/shared/push'

/**
 * Управление push-уведомлениями на устройстве. Показывается в профиле.
 * Гейтит платформы: на iOS вне установленной PWA — подсказка про «Домой»,
 * в неподдерживаемых браузерах — соответствующий текст.
 */
export default function PushSettings() {
  const { t } = useTranslation()
  const toast = useToast()
  const [state, setState] = useState<PushState>('default')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setState(getPushState())
    isPushEnabled().then(setEnabled)
  }, [])

  async function handleEnable() {
    setBusy(true)
    try {
      const ok = await enablePush()
      if (ok) {
        setEnabled(true)
        setState('granted')
        toast({ title: t('push.enabledToast', 'Push-уведомления включены'), status: 'success' })
      } else {
        setState(getPushState())
        toast({ title: t('push.error', 'Не удалось включить уведомления'), status: 'error' })
      }
    } catch {
      toast({ title: t('push.error', 'Не удалось включить уведомления'), status: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      await disablePush()
      setEnabled(false)
      toast({ title: t('push.disabledToast', 'Push-уведомления отключены'), status: 'success' })
    } finally {
      setBusy(false)
    }
  }

  async function handleTest() {
    setBusy(true)
    try {
      await sendTestPush()
      toast({ title: t('push.testSent', 'Тест отправлен'), status: 'success' })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t('push.error', 'Ошибка'), status: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-control)] bg-bg-2 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-accent">
          {enabled ? <Bell size={18} /> : <BellOff size={18} />}
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-ink">{t('push.title', 'Push-уведомления')}</div>
          <div className="text-[12.5px] text-ink-3 mt-0.5">{t('push.description', '')}</div>
        </div>
      </div>

      {state === 'ios-needs-install' && (
        <p className="text-[12.5px] text-ink-3">{t('push.iosHint', '')}</p>
      )}
      {state === 'unsupported' && (
        <p className="text-[12.5px] text-ink-3">{t('push.unavailable', 'Недоступно в этом браузере')}</p>
      )}
      {state === 'denied' && (
        <p className="text-[12.5px] text-danger">{t('push.denied', 'Уведомления заблокированы')}</p>
      )}

      {(state === 'default' || state === 'granted') && (
        enabled ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleDisable} disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <BellOff size={15} />}
              {t('push.disable', 'Отключить')}
            </Button>
            <Button variant="ghost" onClick={handleTest} disabled={busy}>
              {t('push.test', 'Отправить тест')}
            </Button>
          </div>
        ) : (
          <Button className="self-start" onClick={handleEnable} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
            {t('push.enable', 'Включить уведомления')}
          </Button>
        )
      )}
    </div>
  )
}
