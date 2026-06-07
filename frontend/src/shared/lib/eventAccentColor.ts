type AccentColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'indigo' | 'gray'

interface AccentInput {
  id: string
  status?: string
  is_public?: boolean
}

/**
 * Цвет accent-bar слева у строки события.
 * Правила:
 *   completed → gray (всегда)
 *   public → orange (общественное)
 *   private → red/green/purple по хэшу id (вариативность без хаоса)
 */
export function eventAccentColor(event: AccentInput): AccentColor {
  if (event.status === 'completed') return 'gray'

  if (event.is_public) return 'orange'

  // private — стабильный выбор по хэшу id из ограниченной палитры
  const palette: AccentColor[] = ['red', 'green', 'purple', 'indigo']
  let h = 0
  for (let i = 0; i < event.id.length; i++) h = (h * 31 + event.id.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}
