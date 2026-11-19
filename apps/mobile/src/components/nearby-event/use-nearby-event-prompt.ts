import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "@clerk/expo";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { fetchEventDetails, fetchMyTickets } from "@/lib/api";
import { webStorage } from "@/lib/web-storage";
import useStore from "@/store/use-store";
import type { EventSummary } from "@/types/event";
import type { Ticket } from "@/types/ticket";
import {
  eventAt,
  isOnAt,
  liveEvents,
  NEARBY_CHECK_INTERVAL_MS,
  NEARBY_CHECK_MIN_GAP_MS,
  NEARBY_PROMPT_SNOOZE_MS,
  NEARBY_SOURCE,
} from "./nearby-event-model";

export type NearbyPrompt =
  /** The location isn't allowed yet: offer to look for the guest's event. */
  | { kind: "ask" }
  /** At the venue of an event that is on, which the guest hasn't joined. */
  | { kind: "join"; event: EventSummary }
  /** Looked when asked, and no event that is on is here. */
  | { kind: "none-here" };

// "Not now" keeps a prompt away for NEARBY_PROMPT_SNOOZE_MS: the event's id
// for an offer to join, ASK_KEY for the offer to look.
const SNOOZE_STORAGE_KEY = "tulum.nearbyPromptSnoozed";
const ASK_KEY = "ask";
// Native keeps the snoozes while the app runs.
let memorySnoozes: Record<string, number> = {};

function readSnoozes(): Record<string, number> {
  try {
    const stored = webStorage()?.getItem(SNOOZE_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, number>)
      : memorySnoozes;
  } catch {
    return memorySnoozes;
  }
}

function isSnoozed(key: string, now: number): boolean {
  const until = readSnoozes()[key];
  return typeof until === "number" && now < until;
}

function snooze(key: string) {
  const now = Date.now();
  // Snoozes that have run out are dropped as a new one is saved.
  const snoozes = Object.fromEntries(
    Object.entries(readSnoozes()).filter(([, until]) => until > now),
  );
  snoozes[key] = now + NEARBY_PROMPT_SNOOZE_MS;
  memorySnoozes = snoozes;
  try {
    webStorage()?.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(snoozes));
  } catch {
    // Kept in memory only.
  }
}

/** The events less those the guest is known to be going to. */
function notJoined(
  events: EventSummary[],
  joined: Set<string>,
): EventSummary[] {
  const { tickets = [] } = useStore.getState();
  return events.filter(
    (event) =>
      !joined.has(event.id) &&
      !tickets.some((ticket: Ticket) => ticket.event_id === event.id),
  );
}

/**
 * QR-8: offers a guest who opened Tulum without an event's link the event
 * they are at ("You're at Maskenbal. Join?"). It looks when the feed gains
 * focus and when the app comes back to the foreground (at most every
 * NEARBY_CHECK_MIN_GAP_MS), and every NEARBY_CHECK_INTERVAL_MS while the
 * feed is shown. The position is read only once the guest has allowed it,
 * and is compared with the feed's events here, on the phone. Until it is
 * allowed, the prompt offers to look, when people are going to an event
 * that is on.
 */
export function useNearbyEventPrompt() {
  const { isSignedIn, userId, getToken } = useAuth();
  const router = useRouter();
  const hasEvents = useStore(
    (s: { events?: EventSummary[] }) => (s.events?.length ?? 0) > 0,
  );
  const [prompt, setPrompt] = useState<NearbyPrompt | null>(null);
  const [locating, setLocating] = useState(false);

  const lastCheckRef = useRef(0);
  const promptOpenRef = useRef(false);
  useEffect(() => {
    promptOpenRef.current = prompt !== null;
  }, [prompt]);
  // Events the API listed among the guest's tickets: never offered again.
  const joinedRef = useRef(new Set<string>());

  /**
   * Which of these events the guest is at: "join" with the event when it is
   * still on and not joined, "joined" when they are already going to it.
   */
  const findEventHere = useCallback(
    async (
      events: EventSummary[],
    ): Promise<NearbyPrompt | { kind: "joined" }> => {
      const candidates = notJoined(events, joinedRef.current);
      if (candidates.length === 0) {
        // Going to every event that is on, or none is on.
        return events.length > 0 ? { kind: "joined" } : { kind: "none-here" };
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const event = eventAt(candidates, coords);
      if (!event) return { kind: "none-here" };
      const token = await getToken();
      if (!token || !userId) return { kind: "none-here" };

      // The store has your tickets only once the Tickets tab has loaded
      // them, so ask the API. The details go without the token, so they
      // write no 'seen' row.
      const [details, myTickets] = await Promise.all([
        fetchEventDetails(event.id),
        fetchMyTickets(token, userId),
      ]);
      for (const ticket of myTickets as { event_id: string }[]) {
        joinedRef.current.add(String(ticket.event_id));
      }
      if (joinedRef.current.has(event.id)) return { kind: "joined" };
      return isOnAt(details.date, details.endDate, Date.now())
        ? { kind: "join", event }
        : { kind: "none-here" };
    },
    [getToken, userId],
  );

  const check = useCallback(async () => {
    const now = Date.now();
    if (!isSignedIn || promptOpenRef.current) return;
    if (AppState.currentState !== "active") return;
    if (now - lastCheckRef.current < NEARBY_CHECK_MIN_GAP_MS) return;
    lastCheckRef.current = now;

    const { events = [] } = useStore.getState();
    const candidates = notJoined(liveEvents(events, now), joinedRef.current)
      .filter((event) => !isSnoozed(event.id, now));
    if (candidates.length === 0) return;

    try {
      // A browser without the Permissions API can't say: treat it as not
      // asked yet.
      const { status } = await Location.getForegroundPermissionsAsync().catch(
        () => ({ status: Location.PermissionStatus.UNDETERMINED }),
      );
      if (status === Location.PermissionStatus.GRANTED) {
        const found = await findEventHere(candidates);
        if (found.kind === "join" && !promptOpenRef.current) setPrompt(found);
      } else if (
        status === Location.PermissionStatus.UNDETERMINED &&
        !isSnoozed(ASK_KEY, now) &&
        candidates.some((event) => event.guestCount > 0)
      ) {
        setPrompt({ kind: "ask" });
      }
    } catch {
      // No position now: the next check tries again.
    }
  }, [isSignedIn, findEventHere]);

  useFocusEffect(
    useCallback(() => {
      // The feed loads after the app opens; its arrival looks again.
      if (!hasEvents) return;
      void check();
      const interval = setInterval(() => void check(), NEARBY_CHECK_INTERVAL_MS);
      const appStateSubscription = AppState.addEventListener("change", () => {
        void check();
      });
      return () => {
        clearInterval(interval);
        appStateSubscription.remove();
      };
    }, [check, hasEvents]),
  );

  /** "Find my event": asks for the location, then looks. */
  const findMyEvent = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync().catch(
        () => ({ status: Location.PermissionStatus.UNDETERMINED }),
      );
      if (status === Location.PermissionStatus.DENIED) {
        setPrompt(null);
        return;
      }
      const { events = [] } = useStore.getState();
      const found = await findEventHere(liveEvents(events, Date.now()));
      setPrompt(found.kind === "joined" ? null : found);
    } catch {
      setPrompt({ kind: "none-here" });
    } finally {
      setLocating(false);
    }
  }, [findEventHere]);

  const join = useCallback(() => {
    if (prompt?.kind !== "join") return;
    setPrompt(null);
    // The event page joins it, offers a switch from an event at the same
    // time, and opens Matches.
    router.push({
      pathname: "/e/[id]",
      params: { id: prompt.event.id, join: "1", src: NEARBY_SOURCE },
    });
  }, [prompt, router]);

  /** "Not now": the same offer stays away for NEARBY_PROMPT_SNOOZE_MS. */
  const dismiss = useCallback(() => {
    if (prompt?.kind === "join") snooze(prompt.event.id);
    if (prompt?.kind === "ask") snooze(ASK_KEY);
    setPrompt(null);
  }, [prompt]);

  const close = useCallback(() => setPrompt(null), []);

  return { prompt, locating, findMyEvent, join, dismiss, close };
}
