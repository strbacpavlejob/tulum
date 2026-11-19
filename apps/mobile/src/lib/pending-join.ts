import { webStorage } from "@/lib/web-storage";

/**
 * The event a guest asked to join before signing in: they scanned a QR code
 * or opened a link to /e/[id] and tapped Join. It is kept through sign-in and
 * onboarding, and the event page joins it once they are in. On the web the
 * sign-in redirects leave the page, so it is kept in local storage; the
 * sign-in return URL carries it too, in case storage is lost on the way.
 */
export interface PendingJoin {
  eventId: string;
  /** Where the link came from, e.g. a poster (?src=p07). */
  src: string | null;
  savedAt: number;
}

const STORAGE_KEY = "tulum.pendingJoin";
/** A join left this long is dropped: the guest went another way. */
const PENDING_JOIN_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Native keeps it while the app runs: its links don't leave the app.
let memoryJoin: PendingJoin | null = null;

export function savePendingJoin(eventId: string, src?: string | null) {
  memoryJoin = { eventId, src: src || null, savedAt: Date.now() };
  try {
    webStorage()?.setItem(STORAGE_KEY, JSON.stringify(memoryJoin));
  } catch {
    // Kept in memory only.
  }
}

function readStoredJoin(): PendingJoin | null {
  try {
    const stored = webStorage()?.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as PendingJoin) : null;
  } catch {
    return null;
  }
}

export function getPendingJoin(): PendingJoin | null {
  // Storage first: it outlives the page, and memory is only its copy.
  const join = readStoredJoin() ?? memoryJoin;
  if (!join || typeof join.eventId !== "string") return null;
  if (!(Date.now() - join.savedAt < PENDING_JOIN_MAX_AGE_MS)) {
    clearPendingJoin();
    return null;
  }
  return join;
}

/** Drops the saved join; with an event id, only a join for that event. */
export function clearPendingJoin(eventId?: string) {
  if (eventId !== undefined) {
    const join = memoryJoin ?? readStoredJoin();
    if (join && join.eventId !== eventId) return;
  }
  memoryJoin = null;
  try {
    webStorage()?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}

/**
 * Where a signed-in, onboarded guest goes next: the event page, to join the
 * event they asked for, or else the app.
 */
export function signedInHomeHref():
  | "/(tabs)"
  | {
      pathname: "/e/[id]";
      params: { id: string; join: string; src?: string };
    } {
  const join = getPendingJoin();
  if (!join) return "/(tabs)";
  return {
    pathname: "/e/[id]",
    params: {
      id: join.eventId,
      join: "1",
      ...(join.src ? { src: join.src } : {}),
    },
  };
}
