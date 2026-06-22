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
    if (import.meta.env.DEV) {
      // В dev SW не нужен. Снимаем «призрачные» регистрации, оставшиеся от
      // прошлого `npm run preview`/сборки на этом origin — иначе они отдают
      // устаревший закэшированный index.html (ломая HMR и, например, применение
      // сохранённой темы до первой отрисовки). Эффект применится со следующей
      // перезагрузки.
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister())
        })
        if ('caches' in window) {
          caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
        }
      }
      return
    }
    if (!('serviceWorker' in navigator)) return

    const wb = new Workbox('/sw.js', { scope: '/' })
    let reloading = false
    // Был ли контроллер на момент загрузки. Если да — перехват управления новым
    // SW означает обновление, и страницу нужно перезагрузить, чтобы подтянуть
    // свежую сборку. Если нет (самая первая установка) — перезагрузка не нужна,
    // страница уже работает на актуальной версии.
    const hadController = !!navigator.serviceWorker.controller

    // Первая установка без контроллера — приложение готово к офлайну
    wb.addEventListener('installed', (event) => {
      if (!event.isUpdate) toast.success(t('pwa.offlineReady'))
    })
    // Новый SW взял управление (skipWaiting + clientsClaim в sw.ts) —
    // перезагружаем один раз, только если это обновление, а не первый визит.
    wb.addEventListener('controlling', () => {
      if (reloading || !hadController) return
      reloading = true
      window.location.reload()
    })

    wb.register()
  }, [t])

  return null
}
