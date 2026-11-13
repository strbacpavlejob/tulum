/** How near a venue, in metres, a guest must be to use Matches by default. */
export const DEFAULT_CHECKIN_RADIUS_M = 300;
const MIN_CHECKIN_RADIUS_M = 50;
const MAX_CHECKIN_RADIUS_M = 5000;

/**
 * The radius the app checks a guest's location against, in metres. Set
 * CHECKIN_RADIUS_METERS on the API to change it, e.g. after the venue survey
 * or on the night; the API reads it again for every request. A value outside
 * 50..5000 falls back to the default.
 */
export function checkinRadiusMeters(): number {
  const radius = Number.parseInt(process.env.CHECKIN_RADIUS_METERS ?? '', 10);
  return Number.isFinite(radius) &&
    radius >= MIN_CHECKIN_RADIUS_M &&
    radius <= MAX_CHECKIN_RADIUS_M
    ? radius
    : DEFAULT_CHECKIN_RADIUS_M;
}
