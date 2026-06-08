import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Map as MlMap, Marker as MlMarker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Input } from '@/shared/ui'
import { isVkMapsEnabled, vkStyleUrl } from '@/shared/lib/vkmaps'

// maplibre-gl is large, so its JS is dynamically imported (lazy chunk) and only
// loaded when the map actually renders. Only the CSS is statically imported.
type MaplibreModule = typeof import('maplibre-gl')

// [lng, lat] order (MapLibre/VK). Moscow center as the default view.
const DEFAULT_CENTER: [number, number] = [37.618423, 55.751244]

export interface LocationValue {
  address: string
  lat?: number
  lng?: number
}

export default function LocationPicker({
  value,
  onChange,
  placeholder,
}: {
  value: LocationValue
  onChange: (v: LocationValue) => void
  placeholder?: string
}) {
  const { t } = useTranslation()
  const elRef = useRef<HTMLDivElement>(null)
  const mlRef = useRef<MaplibreModule | null>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markerRef = useRef<MlMarker | null>(null)

  // Keep latest onChange/value in refs so the once-bound map handlers aren't stale.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const valueRef = useRef(value)
  valueRef.current = value

  const showMap = isVkMapsEnabled()

  function setMarker(lngLat: [number, number] | null) {
    const map = mapRef.current
    const ml = mlRef.current
    if (!map || !ml) return
    if (!lngLat) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat)
    } else {
      const marker = new ml.Marker({ draggable: true }).setLngLat(lngLat).addTo(map)
      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat()
        onChangeRef.current({ ...valueRef.current, lat, lng })
      })
      markerRef.current = marker
    }
  }

  // Init the map once.
  useEffect(() => {
    if (!showMap || !elRef.current) return
    let cancelled = false

    import('maplibre-gl').then(ml => {
      if (cancelled || !elRef.current) return
      mlRef.current = ml
      const hasPoint = value.lat != null && value.lng != null
      const center: [number, number] = hasPoint ? [value.lng!, value.lat!] : DEFAULT_CENTER
      const map = new ml.Map({
        container: elRef.current,
        style: vkStyleUrl(),
        center,
        zoom: hasPoint ? 16 : 11,
      })
      mapRef.current = map
      if (hasPoint) setMarker(center)
      map.on('click', e => {
        const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat]
        setMarker(lngLat)
        onChangeRef.current({ ...valueRef.current, lat: e.lngLat.lat, lng: e.lngLat.lng })
      })
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Init once; coordinate sync handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the marker in sync with external coordinate changes (edit-mode load).
  useEffect(() => {
    if (!mapRef.current) return
    if (value.lat != null && value.lng != null) setMarker([value.lng, value.lat])
    else setMarker(null)
  }, [value.lat, value.lng])

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={value.address}
        onChange={e => onChange({ ...value, address: e.target.value })}
        placeholder={placeholder}
        required
        autoComplete="off"
      />
      {showMap ? (
        <>
          <div ref={elRef} className="h-[300px] w-full rounded-[10px] overflow-hidden border border-line" />
          <p className="text-[12px] text-ink-3">
            {t('locationPicker.hint', 'Укажите точку на карте кликом или перетащите метку; адрес впишите вручную')}
          </p>
        </>
      ) : (
        <p className="text-[12px] text-ink-3">
          {t('locationPicker.disabled', 'Карта недоступна — введите адрес вручную')}
        </p>
      )}
    </div>
  )
}
