import AttendButton from "@/components/AttendButton";
import { useTranslation } from "react-i18next";
import GuestListModal from "@/components/GuestListModal";
import { Text } from "@/components/ui/text";
import {
  AttendConflictError,
  EventAttendee,
  attendEvent,
  fetchEventAttendees,
  unattendEvent,
} from "@/lib/api";
import useStore from "@/store/useStore";
import { Ticket } from "@/types/ticket";
import { useAuth } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { format, parseISO } from "date-fns";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner-native";
import * as Clipboard from "expo-clipboard";
import { Alert, View, Share } from "react-native";
import LoadingIndicator from "@/components/loading-indicator";
import { AuthGuard } from "@/components/auth-guard";
import { ReservationModal } from "@/components/event-details/ReservationModal";
import { useEventDetailsData } from "@/components/event-details/useEventDetailsData";
import { EventDetailsContent } from "@/components/event-details/EventDetailsContent";
import { EventHero } from "@/components/event-details/EventHero";

// ─── Helpers for deep-linking to contact apps ────────────────────────────

/**
 * Your own row on the guest list: the "You" placeholder added when you
 * attend here, or the server's row marked as yours.
 */
function isOwnGuestRow(guest: EventAttendee): boolean {
  return guest.uri === "__local_you__" || guest.isViewer === true;
}

const EventDetailsScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addTicket, removeTicketByEventId, updateEventAttendance } =
    useStore();
  const { t } = useTranslation();
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const guestListRef = useRef<BottomSheetModal>(null);

  const tickets = useStore((s) => s.tickets);

  const [showReservationModal, setShowReservationModal] = useState(false);
  const { event, loadingEvent, attendeesData, setAttendeesData } =
    useEventDetailsData(id);
  const isAttending = Boolean(tickets?.some((t) => t.event_id === event?.id));

  const handleAttend = async () => {
    if (!userId || !event?.id) {
      toast.error("Unable to attend this event right now.");
      return;
    }
    const token = await getToken();
    if (!token) {
      toast.error("Sign in again to continue.", { duration: 4000 });
      return;
    }

    const isAttending = Boolean(
      useStore.getState().tickets?.some((t) => t.event_id === event.id),
    );

    // If already attending — optimistic cancel
    if (isAttending) {
      const prevTicket =
        useStore.getState().tickets?.find((t) => t.event_id === event.id) ??
        null;
      // Your row in the guest list: the "You" placeholder added when you
      // attended on this screen, or the server's row marked as yours.
      const ownRows = attendeesData.guestList.filter(isOwnGuestRow);
      // Optimistically remove locally
      removeTicketByEventId(event.id);
      updateEventAttendance(event.id, false);
      setAttendeesData((prev) => ({
        ...prev,
        goingCount: Math.max(0, prev.goingCount - 1),
        guestList: prev.guestList.filter((g) => !isOwnGuestRow(g)),
      }));
      try {
        await unattendEvent(token, event.id);
      } catch {
        // rollback
        if (prevTicket) addTicket(prevTicket);
        updateEventAttendance(event.id, true);
        setAttendeesData((prev) => ({
          ...prev,
          goingCount: prev.goingCount + 1,
          guestList: [...ownRows, ...prev.guestList],
        }));
        toast.error("Could not cancel attendance. Please try again.");
        return;
      }
      // An API from before the paged guest list doesn't mark your row, so it
      // can't be picked out here: load the list again, without you.
      // Skip the answer if you have attended again in the meantime.
      fetchEventAttendees(event.id, token)
        .then((data) => {
          const attendingAgain = useStore
            .getState()
            .tickets?.some((t: Ticket) => t.event_id === event.id);
          if (!attendingAgain) setAttendeesData(data);
        })
        .catch(() => {});
      return;
    }

    // Show reservation/contact modal before attending
    if (event.venueContact && event.requiresReservation) {
      setShowReservationModal(true);
      return;
    }

    await confirmAttend();
  };

  const confirmAttend = async () => {
    if (!userId || !event?.id) {
      toast.error("Unable to attend this event right now.");
      return;
    }
    const token = await getToken();
    if (!token) {
      toast.error("Sign in again to continue.");
      return;
    }
    setShowReservationModal(false);
    // Optimistically add a minimal ticket so UI updates immediately.
    const tempTicket: Ticket = {
      id: `temp-${event.id}`,
      event_id: event.id,
      image: event.image ?? null,
      title: event.title,
      description: event.description,
      date: event.date,
      tags: event.tags,
      venue_name: String(event.venueName ?? event.venueName ?? ""),
      location: event.location,
    };
    // add optimistic placeholder guest so details screen updates immediately
    const placeholderGuest = {
      name: t("you"),
      age: null,
      gender: null,
      uri: "__local_you__",
    };
    setAttendeesData((prev) => ({
      ...prev,
      goingCount: prev.goingCount + 1,
      guestList: [placeholderGuest, ...prev.guestList],
    }));
    addTicket(tempTicket);
    updateEventAttendance(event.id, true);
    try {
      const { ticket: raw } = await attendEvent(token, event.id);
      // Replace temp with real ticket; the going count has already moved.
      addTicket({
        id: String(raw.id ?? tempTicket.id),
        event_id: event.id,
        image: event.image ?? null,
        title: event.title,
        description: event.description,
        date: event.date,
        tags: event.tags,
        venue_name: String(
          raw.venue_name ?? event.venueName ?? event.venueName ?? "",
        ),
        location: event.location,
      });
      // Going now, you get the guest list: the API shows it only to guests
      // going. Skip the answer if you have cancelled in the meantime.
      fetchEventAttendees(event.id, token)
        .then((data) => {
          const stillAttending = useStore
            .getState()
            .tickets?.some((t: Ticket) => t.event_id === event.id);
          if (stillAttending) setAttendeesData(data);
        })
        .catch(() => {});
    } catch (err) {
      // rollback optimistic add
      removeTicketByEventId(event.id);
      updateEventAttendance(event.id, false);
      // remove optimistic placeholder guest
      setAttendeesData((prev) => ({
        ...prev,
        goingCount: Math.max(0, prev.goingCount - 1),
        guestList: prev.guestList.filter((g) => g.uri !== "__local_you__"),
      }));
      // An overlap comes with the server's reason, which names the event you
      // already attend; any other failure gets the generic message.
      const message =
        err instanceof AttendConflictError
          ? err.message
          : "Something went wrong. Please try again.";
      Alert.alert("Can't attend", message);
      toast.error(message);
    }
  };

  const openGuestList = useCallback(() => {
    guestListRef.current?.present();
  }, []);

  // The guest list loads a page at a time: the sheet asks for the next one
  // as it scrolls near the end.
  const loadingMoreGuestsRef = useRef(false);
  const loadMoreGuests = useCallback(async () => {
    const cursor = attendeesData.nextCursor;
    if (!id || !cursor || loadingMoreGuestsRef.current) return;
    loadingMoreGuestsRef.current = true;
    try {
      const token = await getToken();
      if (!token) return;
      const page = await fetchEventAttendees(id, token, cursor);
      // Skip the page if the list has loaded again since.
      setAttendeesData((prev) =>
        prev.nextCursor === cursor
          ? {
              ...prev,
              guestList: [...prev.guestList, ...page.guestList],
              nextCursor: page.nextCursor,
            }
          : prev,
      );
    } catch {
      // The sheet asks again when it nears the end again.
    } finally {
      loadingMoreGuestsRef.current = false;
    }
  }, [id, attendeesData.nextCursor, getToken, setAttendeesData]);

  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  }, [router]);

  const handleShare = async () => {
    if (!event) return;
    // The link opens this screen (app/event-details/[id]); sharing and the
    // copy fallback use the same one.
    const url = Linking.createURL(`event-details/${event.id}`);
    try {
      const message = `${event.title}\n${url}`;
      const result = await Share.share({ message, url });
      if (result.action === Share.sharedAction) {
        toast.success(t("linkShared") ?? "Shared");
      }
    } catch {
      await Clipboard.setStringAsync(url);
      toast.success(t("linkCopied") ?? "Link copied");
    }
  };

  if (loadingEvent) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <LoadingIndicator />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <Text className="text-light-gray10 dark:text-dark-gray10">
          {t("noEventSelected")}
        </Text>
      </View>
    );
  }

  // goingCount counts everyone going: guests the list leaves out, and those
  // on pages not loaded yet.
  const {
    maxSpots,
    averageAge,
    females,
    males,
    goingCount,
    guestList,
    hiddenCount,
    nextCursor,
  } = attendeesData;
  const freeSpots = Math.max(0, maxSpots - goingCount);
  const progressValue =
    maxSpots > 0 ? Math.min((goingCount / maxSpots) * 100, 100) : 0;

  return (
    <AuthGuard
      title="Log in to continue"
      message="You need to be logged in to interact with this event."
    >
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {/* Hero */}
        <EventHero
          event={event}
          handleBackPress={handleBackPress}
          handleShare={handleShare}
        />

        {/* Content */}
        <EventDetailsContent
          event={event}
          openGuestList={openGuestList}
          goingCount={goingCount}
          maxSpots={maxSpots}
          guestList={guestList}
          progressValue={progressValue}
          freeSpots={freeSpots}
        />

        {/* Bottom CTA */}
        <View className="px-5 pb-5">
          <AttendButton isAttending={isAttending} onPress={handleAttend} />
        </View>

        <GuestListModal
          ref={guestListRef}
          eventTitle={event.title}
          eventDate={format(parseISO(event.date), "EEEE · h:mm a")}
          guestList={guestList}
          maxSpots={maxSpots}
          averageAge={averageAge}
          females={females}
          males={males}
          isAttending={isAttending}
          onAttend={handleAttend}
          goingCount={goingCount}
          hiddenCount={hiddenCount}
          hasMoreGuests={nextCursor !== null}
          onLoadMoreGuests={loadMoreGuests}
        />

        {/* Reservation modal — shown when attending requires reservation */}
        {event.venueContact && event.requiresReservation && (
          <ReservationModal
            visible={showReservationModal}
            contact={event.venueContact}
            onClose={() => setShowReservationModal(false)}
            onConfirm={confirmAttend}
          />
        )}
      </View>
    </AuthGuard>
  );
};

export default EventDetailsScreen;
