export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** Относительное время: "5 минут назад", "3 часа назад", иначе — время/дата. */
export function formatRelative(iso: string) {
  const date = new Date(iso)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин назад`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24 && isSameDay(date, new Date())) return `${diffHour} ч назад`
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return formatTime(iso)
  return formatDate(iso)
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export const MONTHS_SHORT_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/** Заголовок чата в списке: "12:34" сегодня, "вчера", иначе "DD MMM". */
export function chatListTimestamp(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  if (isSameDay(date, now)) return formatTime(iso)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'вчера'
  return `${date.getDate()} ${MONTHS_SHORT_RU[date.getMonth()]}`
}

/** Заголовок группы по дате: "Сегодня" / "Вчера" / полная дата. */
export function dateGroupLabel(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  if (isSameDay(date, now)) return 'Сегодня'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'Вчера'
  return formatDate(iso)
}
