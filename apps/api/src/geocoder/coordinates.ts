export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Coordinates from two scraped values (numbers or numeric strings), or null
 * when either is missing or out of range, or the pair is 0,0 (a placeholder,
 * not a venue).
 */
export function toCoordinates(
  latitude: unknown,
  longitude: unknown,
): Coordinates | null {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);

  if (lat === null || lng === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;

  return { latitude: lat, longitude: lng };
}

function toFiniteNumber(value: unknown): number | null {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;

  return Number.isFinite(number) ? number : null;
}
