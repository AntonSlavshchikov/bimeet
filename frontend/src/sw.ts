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

// SPA-навигация: любые маршруты отдаём index.html из кэша, кроме /api/*.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//],
  }),
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
