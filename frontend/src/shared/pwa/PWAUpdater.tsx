import { useEffect } from 'react'
import { Workbox } from 'workbox-window'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

/**
 * Регистрирует service worker (генерируется vite-plugin-pwa) и показывает тосты:
 * - waiting    → доступна новая версия, кнопка «Обновить» (skipWaiting + reload)
 * - installed  → приложение готово к работе офлайн (первая установка)
 *
 * Регистрация выполняется напрямую через workbox-window, без виртуального модуля
 * `virtual:pwa-register/react`. Невизуальный компонент; монтируется один раз
 * в провайдерах. Тосты рендерятся существующим <Toaster/> (AuthShell / Layout).
 */
export function PWAUpdater() {
  const { t } = useTranslation()

  useEffect(() => {
    if (import.meta.env.DEV) return
    if (!('serviceWorker' in navigator)) return

    const wb = new Workbox('/sw.js', { scope: '/' })
    let reloading = false

    const promptUpdate = () => {
      toast(t('pwa.updateAvailable'), {
        duration: Infinity,
        action: {
          label: t('pwa.reload'),
          // sw.js (registerType: 'prompt') слушает SKIP_WAITING
          onClick: () => wb.messageSkipWaiting(),
        },
      })
    }

    // Новый SW встал в ожидание (есть активный контроллер) — предлагаем обновиться
    wb.addEventListener('waiting', promptUpdate)
    // Первая установка без контроллера — приложение готово к офлайну
    wb.addEventListener('installed', (event) => {
      if (!event.isUpdate) toast.success(t('pwa.offlineReady'))
    })
    // Новый SW взял управление — перезагружаем страницу один раз
    wb.addEventListener('controlling', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })

    wb.register()
  }, [t])

  return null
}
