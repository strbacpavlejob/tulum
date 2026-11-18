import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/expo";
import {
  fetchEventAttendees,
  fetchEventDetails,
  type EventAttendeesData,
} from "@/lib/api";
import useStore from "@/store/use-store";
import type { Event } from "@/types/event";

/**
 * The event and its guest list for the details screen, loaded once when it
 * opens. Either answer adds a missing ticket to the store when it shows the
 * user is going.
 */
export function useEventDetailsData(id: string | undefined) {
  const { userId, getToken } = useAuth();
  const { addTicket } = useStore();

  const [event, setEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [attendeesData, setAttendeesData] = useState<EventAttendeesData>({
    maxSpots: 0,
    averageAge: null,
    females: 0,
    males: 0,
    goingCount: 0,
    guestList: [],
    hiddenCount: 0,
    nextCursor: null,
  });

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

  // Fetch attendees once when this screen loads: the numbers and the first
  // page of the guest list.
  useEffect(() => {
    if (!id || !userId) return;

    let mounted = true;

    const refresh = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const data = await fetchEventAttendees(id, token);
        if (!mounted || !data) return;

        setAttendeesData(data);

        // If backend indicates the user is in the guest list but local tickets
        // don't have the event, add a minimal ticket to keep UI consistent.
        // The going count already includes you.
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
        // ignore
      }
    };

    refresh();

    return () => {
      mounted = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId]);

  return {
    event,
    loadingEvent,
    attendeesData,
    setAttendeesData,
  };
}
