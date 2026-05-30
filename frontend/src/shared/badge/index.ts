// Badging API — числовой бейдж на иконке установленной PWA.
// navigator.setAppBadge(count) / clearAppBadge(). Поддержка: Chrome/Edge
// (desktop + Android), macOS Safari, iOS/iPadOS Safari 16.4+ (только в PWA,
// установленной на «Домой»). Вне поддержки — тихий no-op.

interface BadgeNavigator {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

export function isBadgeSupported(): boolean {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator
}

/** Ставит бейдж с числом непрочитанных; при 0 — снимает. Ошибки игнорирует. */
export function setBadge(count: number): void {
  if (!isBadgeSupported()) return
  const nav = navigator as BadgeNavigator
  try {
    if (count > 0) {
      void nav.setAppBadge?.(count)
    } else {
      void nav.clearAppBadge?.()
    }
  } catch {
    // не поддерживается / нет разрешения — игнорируем
  }
}

/** Снимает бейдж с иконки. Ошибки игнорирует. */
export function clearBadge(): void {
  if (!isBadgeSupported()) return
  const nav = navigator as BadgeNavigator
  try {
    void nav.clearAppBadge?.()
  } catch {
    // игнорируем
  }
}
