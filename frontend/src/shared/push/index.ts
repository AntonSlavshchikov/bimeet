// Web Push (VAPID) — подписка/отписка устройства на пуши.
// Доставляет уведомления даже при закрытом приложении (через service worker).
// На iOS работает только в установленной на «Домой» PWA (Safari 16.4+).

import { apiFetch } from '@/shared/api/client'

export type PushState =
  | 'unsupported' // браузер/платформа не поддерживает push
  | 'ios-needs-install' // iOS, но PWA не установлена на «Домой»
  | 'default' // поддерживается, разрешение ещё не запрашивалось
  | 'granted' // разрешение есть
  | 'denied' // пользователь запретил уведомления

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getPushState(): PushState {
  if (!isPushSupported()) {
    // На iOS push доступен только из установленной PWA — подскажем установить.
    if (isIOS() && !isStandalone()) return 'ios-needs-install'
    return 'unsupported'
  }
  return Notification.permission as PushState
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

async function getVapidPublicKey(): Promise<string> {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (envKey) return envKey
  const res = await apiFetch<{ key: string }>('/api/push/vapid-public-key')
  return res.key
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.ready
}

/** Возвращает true, если на этом устройстве уже есть активная push-подписка. */
export async function isPushEnabled(): Promise<boolean> {
  if (!isPushSupported()) return false
  const reg = await getRegistration()
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  return sub !== null
}

/**
 * Запрашивает разрешение, подписывает устройство и отправляет подписку на бэк.
 * Должна вызываться из пользовательского жеста (клик). Возвращает true при успехе.
 */
export async function enablePush(): Promise<boolean> {
  if (!isPushSupported()) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await getRegistration()
  if (!reg) return false

  const vapidKey = await getVapidPublicKey()
  if (!vapidKey) return false

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const json = sub.toJSON()
  await apiFetch<void>('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    }),
  })
  return true
}

/** Просит бэк прислать тестовый пуш на текущий аккаунт. Бросает ошибку с текстом ответа push-сервиса. */
export async function sendTestPush(): Promise<void> {
  await apiFetch<void>('/api/push/test', { method: 'POST' })
}

/** Отписывает устройство локально и удаляет подписку на бэке. */
export async function disablePush(): Promise<void> {
  const reg = await getRegistration()
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  try {
    await apiFetch<void>('/api/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    })
  } catch {
    // подписка уже могла протухнуть на бэке — игнорируем
  }
}
