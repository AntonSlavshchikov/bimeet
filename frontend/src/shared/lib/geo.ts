export interface Coordinates {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180
}

/** Returns the great-circle distance between two WGS84 points. */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}
