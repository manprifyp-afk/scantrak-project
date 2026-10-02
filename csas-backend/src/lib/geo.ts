// ---------------------------------------------------------------------------
//  Geo-fence math
//
//  The whole geo-fence is a distance comparison: how far is the student from
//  the classroom's stored center, and is that within the allowed radius?
//  We use the Haversine formula, which gives great-circle distance between
//  two latitude/longitude points on a sphere — accurate to a meter or two at
//  campus scale, which is all we need.
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_000; // mean radius of the Earth in meters

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance between two points, in meters. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Is `captured` within `radiusMeters` of `center`?
 * Returns both the verdict and the measured distance (handy for logging and
 * for telling the student how far off they were).
 */
export function isInsideFence(
  captured: LatLng,
  center: LatLng,
  radiusMeters: number
): { inside: boolean; distanceMeters: number } {
  const d = distanceMeters(captured.lat, captured.lng, center.lat, center.lng);
  return { inside: d <= radiusMeters, distanceMeters: d };
}
