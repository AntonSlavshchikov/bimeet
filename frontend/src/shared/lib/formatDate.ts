export function formatDate(iso: string, locale = 'ru-RU') {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(iso: string, locale = 'ru-RU') {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** Относительное время: "5 минут назад", "3 часа назад", иначе — время/дата. */
export function formatRelative(iso: string, locale = 'ru-RU') {
  const date = new Date(iso)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (diffMin < 1) return relative.format(0, 'second')
  if (diffMin < 60) return relative.format(-diffMin, 'minute')
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24 && isSameDay(date, new Date())) return relative.format(-diffHour, 'hour')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return formatTime(iso, locale)
  return formatDate(iso, locale)
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Заголовок группы по дате: "Сегодня" / "Вчера" / полная дата. */
export function dateGroupLabel(iso: string, locale = 'ru-RU') {
  const date = new Date(iso)
  const now = new Date()
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (isSameDay(date, now)) return relative.format(0, 'day')
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return relative.format(-1, 'day')
  return formatDate(iso, locale)
}
