import { parseDbTimestampMs } from '../common/db-timestamp';

// The rules POST /events/sessions checks a guest against. They are the ones
// the app's Matches screen applies (apps/mobile/app/(tabs)/matches.tsx), so
// the two agree, and calling the API directly no longer skips them.

/** Matches opens this long before an event's start, as in the app. */
export const PRE_EVENT_GRACE_MS = 5 * 60 * 1000;

/** Great-circle distance in metres, with the app's formula. */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Whether a position counts as at the venue: within the radius once its
 * reported accuracy is allowed for. The allowance is at most the radius, so a
 * vague position still has to be nearby.
 */
export function isAtVenue(
  distanceM: number,
  accuracyM: number | null | undefined,
  radiusM: number,
): boolean {
  const allowance = Math.min(Math.max(accuracyM ?? 0, 0), radiusM);
  return distanceM - allowance <= radiusM;
}

/** Whether the event is on: from PRE_EVENT_GRACE_MS before its start to its end. */
export function isEventOn(
  start: unknown,
  end: unknown,
  nowMs: number,
): boolean {
  const startMs = parseDbTimestampMs(start);
  const endMs = parseDbTimestampMs(end);
  return (
    startMs !== null &&
    endMs !== null &&
    nowMs >= startMs - PRE_EVENT_GRACE_MS &&
    nowMs <= endMs
  );
}

/**
 * The venue's position, or null when it has none to check against: no
 * coordinates, or 0,0, which marks a venue that was never located.
 */
export function venuePosition(
  venue: { latitude?: unknown; longitude?: unknown } | null | undefined,
): { latitude: number; longitude: number } | null {
  if (venue?.latitude == null || venue.longitude == null) return null;
  const latitude = Number(venue.latitude);
  const longitude = Number(venue.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}
