import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import type { Map as MlMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { isVkMapsEnabled, vkStyleUrl, vkMapUrl } from '@/shared/lib/vkmaps'

// LocationMap is a read-only mini-map with a single marker for the event detail.
// maplibre-gl JS is dynamically imported (lazy chunk). Falls back to just the
// «open on map» link when no VK key is configured.
export default function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  const { t } = useTranslation()
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const enabled = isVkMapsEnabled()

  useEffect(() => {
    if (!enabled || !elRef.current) return
    let cancelled = false
    import('maplibre-gl').then(ml => {
      if (cancelled || !elRef.current) return
      const map = new ml.Map({
        container: elRef.current,
        style: vkStyleUrl(),
        center: [lng, lat],
        zoom: 16,
        scrollZoom: false,
      })
      mapRef.current = map
      new ml.Marker().setLngLat([lng, lat]).addTo(map)
    })
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [enabled, lat, lng])

  return (
    <div className="flex flex-col gap-2">
      {enabled && (
        <div ref={elRef} className="h-[180px] w-full rounded-[10px] overflow-hidden border border-line" />
      )}
      <a
        href={vkMapUrl(lat, lng)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline"
      >
        <ExternalLink size={13} />
        {t('locationPicker.openMap', 'Открыть на VK Картах')}
      </a>
    </div>
  )
}
