import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "@clerk/expo";
import { useFocusEffect } from "expo-router";
import {
  fetchEventAttendees,
  fetchEventDetails,
  type EventAttendeesData,
} from "@/lib/api";
import useStore from "@/store/use-store";
import type { Event } from "@/types/event";

/** How often the event's numbers load again while the screen is shown. */
const ATTENDEE_COUNTS_REFRESH_MS = 30_000;

/**
 * The event and its guest list for the details screen. The event loads once
 * when the screen opens. The numbers and the first page of the guest list
 * load when the screen gains focus, then the numbers alone every
 * ATTENDEE_COUNTS_REFRESH_MS while it is shown (BUG-042); the pages already
 * loaded stay as they are. Either answer adds a missing ticket to the store
 * when it shows the user is going.
 */
export function useEventDetailsData(id: string | undefined) {
  const { userId, getToken } = useAuth();
  const { addTicket } = useStore();

  const [event, setEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [attendeesData, setAttendeesState] = useState<EventAttendeesData>({
    maxSpots: 0,
    averageAge: null,
    females: 0,
    males: 0,
    goingCount: 0,
    guestList: [],
    hiddenCount: 0,
    nextCursor: null,
  });

  // Every change made on this screen (attending, cancelling, another page)
  // moves the revision. Numbers that loaded across a change are dropped:
  // they may not count it yet.
  const revisionRef = useRef(0);
  const setAttendeesData = useCallback(
    (update: SetStateAction<EventAttendeesData>) => {
      revisionRef.current += 1;
      setAttendeesState(update);
    },
    [],
  );

  // Fetch full event details on mount
  useEffect(() => {
    if (!id) return;
    getToken()
      .then((token) => fetchEventDetails(id, token ?? undefined))
      .then((data) => {
        setEvent(data);
        // If backend reports user is attending but local store lacks the ticket,
        // add a minimal ticket so UI stays in sync. The going count already
        // includes you, so it stays as it is.
        if (data.isAttending) {
          const has = useStore
            .getState()
            .tickets?.some((t) => t.event_id === data.id);
          if (!has) {
            addTicket({
              id: `remote-${data.id}`,
              event_id: data.id,
              image: data.image ?? null,
              title: data.title,
              description: data.description,
              date: data.date,
              tags: data.tags,
              venue_name: String(data.venueName ?? ""),
              location: data.location,
            });
          }
        }
      })
      .catch(() => setLoadingEvent(false))
      .finally(() => setLoadingEvent(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep a ref to the latest event so the refresh interval doesn't have to
  // include `event` in deps (which can cause frequent re-runs).
  const eventRef = useRef<Event | null>(event);
  useEffect(() => {
    eventRef.current = event;
  }, [event]);

  // The numbers and the first page of the guest list when the screen gains
  // focus, then the numbers alone every ATTENDEE_COUNTS_REFRESH_MS while the
  // app is in the foreground, and at once when it comes back to it. A
  // refresh waits while a request is out, and none runs after the screen
  // loses focus.
  const requestsOutRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      if (!id || !userId) return;

      let focused = true;

      const load = async (numbersOnly: boolean) => {
        requestsOutRef.current += 1;
        const revision = revisionRef.current;
        try {
          const token = await getToken();
          if (!token) return;

          const data = await fetchEventAttendees(
            id,
            token,
            null,
            numbersOnly ? 0 : undefined,
          );
          if (!focused || !data) return;

          if (numbersOnly) {
            if (revisionRef.current !== revision) return;
            setAttendeesState((prev) => ({
              ...prev,
              maxSpots: data.maxSpots,
              averageAge: data.averageAge,
              females: data.females,
              males: data.males,
              goingCount: data.goingCount,
              hiddenCount: data.hiddenCount,
            }));
            return;
          }

          setAttendeesData(data);

          // If backend indicates the user is in the guest list but local
          // tickets don't have the event, add a minimal ticket to keep UI
          // consistent. The going count already includes you.
          const isUserInList = data.guestList.some((g) => g.isViewer);

          const hasTicket = useStore
            .getState()
            .tickets?.some((t) => t.event_id === id);

          const currentEvent = eventRef.current;

          if (isUserInList && !hasTicket && currentEvent) {
            addTicket({
              id: `remote-${id}`,
              event_id: currentEvent.id,
              image: currentEvent.image ?? null,
              title: currentEvent.title,
              description: currentEvent.description,
              date: currentEvent.date,
              tags: currentEvent.tags,
              venue_name: String(currentEvent.venueName ?? ""),
              location: currentEvent.location,
            });
          }
        } catch {
          // The next refresh asks again.
        } finally {
          requestsOutRef.current -= 1;
        }
      };

      const refreshNumbers = () => {
        if (AppState.currentState !== "active") return;
        if (requestsOutRef.current > 0) return;
        void load(true);
      };

      void load(false);
      const interval = setInterval(refreshNumbers, ATTENDEE_COUNTS_REFRESH_MS);
      const appStateSubscription = AppState.addEventListener(
        "change",
        refreshNumbers,
      );

      return () => {
        focused = false;
        clearInterval(interval);
        appStateSubscription.remove();
      };

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, userId]),
  );

  return {
    event,
    loadingEvent,
    attendeesData,
    setAttendeesData,
  };
}
