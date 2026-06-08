const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dateTimeFmt = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso))
}

// formatDuration renders the gap between two ISO timestamps as «30м» / «1ч» / «1ч 30м».
export function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  const mins = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}ч ${m}м`
  if (h) return `${h}ч`
  return `${m}м`
}

// isOngoing is true when now falls inside the [start, end] window.
export function isOngoing(startIso: string, endIso: string): boolean {
  const now = Date.now()
  return now >= new Date(startIso).getTime() && now <= new Date(endIso).getTime()
}

// isSameLocalDay compares an ISO timestamp against a Date by local calendar day.
export function isSameLocalDay(iso: string, day: Date): boolean {
  const d = new Date(iso)
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  )
}

// workWeekDays returns Mon–Fri of the week containing `ref` (today by default),
// as local Date objects at midnight — used by the day-picker.
export function workWeekDays(ref: Date = new Date()): Date[] {
  const base = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const dow = (base.getDay() + 6) % 7 // 0 = Monday
  const monday = new Date(base)
  monday.setDate(base.getDate() - dow)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const weekdayShortFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
const dayMonthFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

// weekdayShort → «пн», «вт», … (capitalised). dayMonthLong → «понедельник, 8 июня».
export function weekdayShort(day: Date): string {
  const s = weekdayShortFmt.format(day).replace('.', '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export function dayMonthLong(day: Date): string {
  return dayMonthFmt.format(day)
}

// meetingPlatform derives a short label from a meeting URL host (Meet/Zoom/…),
// falling back to «Онлайн» for unknown hosts.
export function meetingPlatform(url: string): string {
  if (!url) return ''
  let host = ''
  try {
    host = new URL(url).host.toLowerCase()
  } catch {
    host = url.toLowerCase()
  }
  if (host.includes('meet.google')) return 'Meet'
  if (host.includes('zoom')) return 'Zoom'
  if (host.includes('teams.microsoft') || host.includes('teams.live')) return 'Teams'
  if (host.includes('telemost') || host.includes('yandex')) return 'Телемост'
  if (host.includes('whereby')) return 'Whereby'
  if (host.includes('webinar') || host.includes('ktalk') || host.includes('contour')) return 'Контур'
  return 'Онлайн'
}

// toDatetimeLocal converts an ISO string to the value a datetime-local input
// expects (YYYY-MM-DDTHH:mm in local time).
export function toDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
