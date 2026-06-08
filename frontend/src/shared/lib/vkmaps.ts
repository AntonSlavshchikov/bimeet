// VK Maps is a MapLibre-compatible vector map, so we render it with maplibre-gl
// pointed at VK's style + access key.
//
// Configure VITE_VKMAPS_KEY (required to show the map). The style URL defaults to
// VK's public style (path inferred from the docs' pin URL https://maps.vk.com/api/
// styles/…); override with VITE_VKMAPS_STYLE_URL if VK serves it elsewhere. Geocoding
// (address search) is not wired yet — point selection is by clicking the map.
const KEY = import.meta.env.VITE_VKMAPS_KEY as string | undefined

const STYLE_BASE =
  (import.meta.env.VITE_VKMAPS_STYLE_URL as string | undefined) ??
  'https://maps.vk.com/api/styles/main_style.json'

export function isVkMapsEnabled(): boolean {
  return Boolean(KEY)
}

// vkStyleUrl appends the access key to VK's style URL.
export function vkStyleUrl(): string {
  if (!KEY) return STYLE_BASE
  return STYLE_BASE.includes('?') ? `${STYLE_BASE}&key=${KEY}` : `${STYLE_BASE}?key=${KEY}`
}

// vkMapUrl builds a deep link to VK Maps centered on a point (lng,lat order).
export function vkMapUrl(lat: number, lng: number): string {
  return `https://maps.vk.com/?ll=${lng},${lat}&z=16`
}
