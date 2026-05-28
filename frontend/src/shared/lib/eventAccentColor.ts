type AccentColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'indigo' | 'gray'

interface AccentInput {
  id: string
  category?: string
  status?: string
  is_public?: boolean
  title?: string
}

/**
 * Цвет accent-bar слева у строки события.
 * Правила:
 *   completed → gray (всегда)
 *   business → blue (онлайн/звонки) или gray (логистика)
 *   ordinary publicc → orange (общественное)
 *   ordinary private → red/green/purple по хэшу id (вариативность без хаоса)
 */
export function eventAccentColor(event: AccentInput): AccentColor {
  if (event.status === 'completed') return 'gray'

  if (event.category === 'business') {
    // карпулинг / логистика по заголовку — серый, остальное синее
    const title = (event.title ?? '').toLowerCase()
    if (/карпул|трансфер|такси|шерем|внуков|домодедов/.test(title)) return 'gray'
    return 'blue'
  }

  if (event.is_public) return 'orange'

  // private ordinary — стабильный выбор по хэшу id из ограниченной палитры
  const palette: AccentColor[] = ['red', 'green', 'purple', 'indigo']
  let h = 0
  for (let i = 0; i < event.id.length; i++) h = (h * 31 + event.id.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}
