export type DeviceKind = 'desktop' | 'mobile' | 'tablet'

export interface DeviceDescription {
  browser: string
  os: string
  kind: DeviceKind
}

export function describeUserAgent(userAgent: string): DeviceDescription {
  const ua = userAgent || ''

  let browser = 'Browser'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/CriOS\//i.test(ua)) browser = 'Chrome'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua)) browser = 'Safari'

  let os = 'Unknown device'
  if (/iPad/i.test(ua)) os = 'iPadOS'
  else if (/iPhone|iPod/i.test(ua)) os = 'iOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  const kind: DeviceKind = /iPad|Tablet/i.test(ua)
    ? 'tablet'
    : /Mobile|iPhone|iPod|Android/i.test(ua)
      ? 'mobile'
      : 'desktop'

  return { browser, os, kind }
}
