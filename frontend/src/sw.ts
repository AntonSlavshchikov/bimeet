/// <reference lib="webworker" />
// Кастомный service worker (vite-plugin-pwa, strategies: injectManifest).
// Сохраняет precache/офлайн + SKIP_WAITING (как было в generateSW) и добавляет
// обработчики Web Push: `push` (показ уведомления) и `notificationclick`.

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

// Precache всех ассетов из манифеста сборки → офлайн-доступ.
precacheAndRoute(self.__WB_MANIFEST)

// SPA-навигация: network-first. На каждый переход/перезагрузку берём свежий
// index.html из сети (важно — он содержит inline-бутстрап темы и ссылки на
// актуальные ассеты), а офлайн откатываемся на precache-копию shell'а. Без
// этого SW отдавал бы закэшированный index.html, и правки в <head> (например,
// применение сохранённой темы до первой отрисовки) не подхватывались бы при
// перезагрузке, пока не обновится сам SW. /api/* сюда не попадает.
const cachedShell = createHandlerBoundToURL('/index.html')
registerRoute(
  new NavigationRoute(
    async (params) => {
      try {
        const fresh = await fetch(params.request)
        if (fresh && (fresh.ok || fresh.type === 'opaqueredirect')) return fresh
        return cachedShell(params)
      } catch {
        return cachedShell(params)
      }
    },
    { denylist: [/^\/api\//] },
  ),
)

// Кнопка «Обновить» в PWAUpdater шлёт SKIP_WAITING — активируем новый SW.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
  badge?: number // число непрочитанных → бейдж на иконке PWA (Badging API)
}

// Приходит web push (даже при закрытом приложении) → показываем системное уведомление.
self.addEventListener('push', (event) => {
  let data: PushPayload = {}
  if (event.data) {
    try {
      data = event.data.json() as PushPayload
    } catch {
      data = { body: event.data.text() }
    }
  }

  const title = data.title || 'Bimeet'

  // Бейдж на иконке PWA (фоновая установка при закрытом приложении). Когда
  // приложение открыто, его перекрывает AppBadgeSync. Гейтим по поддержке.
  if (typeof data.badge === 'number' && 'setAppBadge' in self.navigator) {
    if (data.badge > 0) {
      void self.navigator.setAppBadge(data.badge)
    } else {
      void self.navigator.clearAppBadge()
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    }),
  )
})

// Клик по уведомлению → фокус открытой вкладки или открытие нужного экрана.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const url = new URL(client.url)
        if (url.pathname === targetUrl || client.url.endsWith(targetUrl)) {
          return client.focus()
        }
      }
      // Иначе фокусируем любую вкладку и навигируем, либо открываем новую.
      if (clientList.length > 0 && 'navigate' in clientList[0]) {
        return clientList[0].focus().then((c) => c.navigate(targetUrl))
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
