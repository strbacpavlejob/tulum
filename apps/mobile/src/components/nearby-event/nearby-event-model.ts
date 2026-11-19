import {
  isAtVenue,
  PRE_EVENT_GRACE_MS,
  PROXIMITY_RADIUS_M,
} from "@/components/matches/matches-model";
import { haversineMeters } from "@/lib/geo";
import type { EventSummary } from "@/types/event";

/** While the feed is shown, the live events are looked at this often. */
export const NEARBY_CHECK_INTERVAL_MS = 2 * 60 * 1000;

/** Focus and the app's return look again only after this long. */
export const NEARBY_CHECK_MIN_GAP_MS = 60 * 1000;

/** How long "Not now" keeps a prompt away. */
export const NEARBY_PROMPT_SNOOZE_MS = 12 * 60 * 60 * 1000;

/** The attribution tag of joins from this prompt (/e/[id]?src=nearby). */
export const NEARBY_SOURCE = "nearby";

/**
 * Whether an event is on: from PRE_EVENT_GRACE_MS before its start, when
 * Matches opens, to its end.
 */
export function isOnAt(
  start: string,
  end: string | null | undefined,
  now: number,
): boolean {
  const startMs = Date.parse(start);
  const endMs = end ? Date.parse(end) : null;
  return startMs - PRE_EVENT_GRACE_MS <= now && (endMs === null || now <= endMs);
}

/**
 * The feed's events that are on, at a venue with a known position. The feed
 * lists only events that hadn't ended when it loaded, so a start is enough
 * here; check the end before offering one.
 */
export function liveEvents(
  events: EventSummary[],
  now: number,
): EventSummary[] {
  return events.filter((event) => {
    const { latitude, longitude } = event.location ?? {};
    return (
      isOnAt(event.date, null, now) &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      // Venues without a position are stored at 0,0.
      !(latitude === 0 && longitude === 0)
    );
  });
}

/**
 * The nearest of the events whose venue the position is at, allowing for its
 * accuracy as the Matches check does. That check uses the API's radius,
 * which comes only with a ticket; this one the app's default, since it only
 * suggests joining and the server checks presence at check-in.
 */
export function eventAt(
  events: EventSummary[],
  position: { latitude: number; longitude: number; accuracy: number | null },
): EventSummary | null {
  let nearest: EventSummary | null = null;
  let nearestDistance = Infinity;
  for (const event of events) {
    const distance = haversineMeters(
      position.latitude,
      position.longitude,
      event.location.latitude,
      event.location.longitude,
    );
    if (
      distance < nearestDistance &&
      isAtVenue(distance, position.accuracy, PROXIMITY_RADIUS_M)
    ) {
      nearest = event;
      nearestDistance = distance;
    }
  }
  return nearest;
}
