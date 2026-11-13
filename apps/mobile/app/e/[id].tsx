import LoadingIndicator from "@/components/loading-indicator";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  AttendConflictError,
  EventNotFoundError,
  attendEvent,
  fetchEventDetails,
  fetchMyTickets,
  unattendEvent,
} from "@/lib/api";
import {
  clearPendingJoin,
  getPendingJoin,
  savePendingJoin,
} from "@/lib/pending-join";
import useStore from "@/store/useStore";
import { Event } from "@/types/event";
import { useAuth } from "@clerk/expo";
import { format } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarClock, MapPin, Users } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// The page a QR code on a poster opens: /e/{eventId}?src=p07. It shows the
// event to anyone, signed in or not, with one button: Join the party. A
// signed-out guest signs in first, the event travels with them (see
// lib/pending-join), and the page joins it when they come back. Once in, it
// counts down to the start or opens Matches.

/** Matches opens this long before the start, as on the Matches tab. */
const MATCHES_OPEN_BEFORE_START_MS = 5 * 60 * 1000;
/** How often the countdown moves. */
const COUNTDOWN_TICK_MS = 15_000;

type Phase = "upcoming" | "live" | "ended";

function phaseAt(event: Event, now: number): Phase {
  const start = Date.parse(event.date);
  const end = event.endDate ? Date.parse(event.endDate) : null;
  if (end !== null && now > end) return "ended";
  if (now >= start - MATCHES_OPEN_BEFORE_START_MS) return "live";
  return "upcoming";
}

/** The event the 409 names, from "...overlaps with "Title" that you...". */
function conflictTitle(message: string): string | null {
  return message.match(/"(.+)"/)?.[1] ?? null;
}

type JoinStatus = "idle" | "joining" | "joined" | "conflict" | "failed";

interface Conflict {
  title: string;
  /** The ticket's event, when it could be found among your tickets. */
  eventId: string | null;
}

export default function EventJoinScreen() {
  const { id, src, join } = useLocalSearchParams<{
    id: string;
    src?: string;
    join?: string;
  }>();
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { addTicket, removeTicketByEventId, updateEventAttendance } =
    useStore();

  const [event, setEvent] = useState<Event | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "missing" | "failed"
  >("loading");
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Set once this page joined, or was opened to join: Matches then opens by
  // itself when it is time.
  const openMatchesWhenLiveRef = useRef(false);
  const autoJoinStartedRef = useRef(false);

  const findConflict = useCallback(
    async (
      target: Event,
      token: string,
      message: string,
    ): Promise<Conflict> => {
      const title = conflictTitle(message) ?? "";
      if (!userId) return { title, eventId: null };
      try {
        // The API names the other event; its id is in your tickets. Windows
        // overlap when start1 < end2 and start2 < end1, earliest first, as
        // the API checks them.
        const start = Date.parse(target.date);
        const end = target.endDate ? Date.parse(target.endDate) : start;
        const overlapping = (await fetchMyTickets(token, userId))
          .filter(
            (ticket: {
              event_id: string;
              date?: string | null;
              end_date_time?: string | null;
            }) =>
              ticket.event_id !== target.id &&
              ticket.date &&
              ticket.end_date_time &&
              Date.parse(ticket.date) < end &&
              start < Date.parse(ticket.end_date_time),
          )
          .sort(
            (a: { date: string }, b: { date: string }) =>
              Date.parse(a.date) - Date.parse(b.date),
          );
        const match =
          overlapping.find(
            (ticket: { title?: string }) => ticket.title === title,
          ) ?? overlapping[0];
        return {
          title: title || match?.title || "",
          eventId: match ? String(match.event_id) : null,
        };
      } catch {
        return { title, eventId: null };
      }
    },
    [userId],
  );

  const joinEvent = useCallback(
    async (target: Event) => {
      setJoinStatus("joining");
      setConflict(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("No token");
        const { ticket } = await attendEvent(token, target.id);
        addTicket({
          id: String(ticket?.id ?? `remote-${target.id}`),
          event_id: target.id,
          image: target.image || null,
          title: target.title,
          description: target.description,
          date: target.date,
          tags: target.tags,
          venue_name: target.venueName,
          location: target.location,
        });
        updateEventAttendance(target.id, true);
        setEvent((prev) =>
          prev && prev.id === target.id && !prev.isAttending
            ? { ...prev, isAttending: true, guestCount: prev.guestCount + 1 }
            : prev,
        );
        clearPendingJoin(target.id);
        openMatchesWhenLiveRef.current = true;
        setJoinStatus("joined");
      } catch (err) {
        if (err instanceof AttendConflictError) {
          const token = await getToken().catch(() => null);
          setConflict(
            token
              ? await findConflict(target, token, err.message)
              : { title: conflictTitle(err.message) ?? "", eventId: null },
          );
          setJoinStatus("conflict");
          return;
        }
        setJoinStatus("failed");
      }
    },
    [findConflict, addTicket, updateEventAttendance], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // The event, and whether you are going: the API says so when signed in.
  const fetchEvent = useCallback(async () => {
    const token = isSignedIn ? await getToken() : null;
    return fetchEventDetails(id, token ?? undefined);
  }, [id, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const showEvent = useCallback(
    (details: Event) => {
      setEvent(details);
      setLoadState("ready");

      // Back from sign-in and onboarding (?join=1), or a join saved before
      // them: join without another tap.
      const asked = join === "1" || getPendingJoin()?.eventId === details.id;
      if (!isSignedIn || !asked || autoJoinStartedRef.current) return;
      autoJoinStartedRef.current = true;
      openMatchesWhenLiveRef.current = true;
      if (details.isAttending || phaseAt(details, Date.now()) === "ended") {
        clearPendingJoin(details.id);
        return;
      }
      void joinEvent(details);
    },
    [isSignedIn, join, joinEvent],
  );

  const showLoadError = (err: unknown) =>
    setLoadState(err instanceof EventNotFoundError ? "missing" : "failed");

  useEffect(() => {
    if (!isLoaded || !id) return;
    let cancelled = false;
    fetchEvent().then(
      (details) => {
        if (!cancelled) showEvent(details);
      },
      (err) => {
        if (!cancelled) showLoadError(err);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isLoaded, id, fetchEvent, showEvent]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  const phase = event ? phaseAt(event, now) : null;
  const attending = Boolean(event?.isAttending) || joinStatus === "joined";

  // An ended or missing event has nothing left to join.
  useEffect(() => {
    if (loadState === "missing" || phase === "ended") clearPendingJoin(id);
  }, [id, loadState, phase]);

  // In, and Matches is open: go there.
  useEffect(() => {
    if (attending && phase === "live" && openMatchesWhenLiveRef.current) {
      openMatchesWhenLiveRef.current = false;
      router.replace("/(tabs)/matches");
    }
  }, [attending, phase, router]);

  const switchToThisEvent = async () => {
    if (!event || !conflict?.eventId) return;
    setJoinStatus("joining");
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");
      await unattendEvent(token, conflict.eventId);
      removeTicketByEventId(conflict.eventId);
      updateEventAttendance(conflict.eventId, false);
    } catch {
      setJoinStatus("failed");
      return;
    }
    await joinEvent(event);
  };

  const keepOtherEvent = () => {
    clearPendingJoin(id);
    openMatchesWhenLiveRef.current = false;
    setConflict(null);
    setJoinStatus("idle");
  };

  const onJoinPress = () => {
    if (!event) return;
    if (!isSignedIn) {
      savePendingJoin(event.id, src);
      router.push({
        pathname: "/(auth)/sign-in",
        params: { join: event.id, ...(src ? { src } : {}) },
      });
      return;
    }
    void joinEvent(event);
  };

  const retryLoad = () => {
    setLoadState("loading");
    fetchEvent().then(showEvent, showLoadError);
  };

  const dateLocale =
    i18n.language === "RU" ? ru : i18n.language === "RS" ? srLatn : enUS;

  if (!isLoaded || loadState === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <LoadingIndicator />
      </View>
    );
  }

  if (loadState !== "ready" || !event || !phase) {
    const missing = loadState === "missing";
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-3 bg-light-background px-8 dark:bg-dark-background">
        <Text className="text-center text-xl font-bold text-light-gray12 dark:text-dark-gray12">
          {missing ? t("eventNotFound") : t("eventLoadFailed")}
        </Text>
        {missing ? (
          <Text className="text-center text-sm text-light-gray10 dark:text-dark-gray10">
            {t("eventNotFoundSubtitle")}
          </Text>
        ) : null}
        <Button
          onPress={() => (missing ? router.replace("/") : retryLoad())}
          className="mt-2 rounded-full px-6"
          style={{ backgroundColor: theme.color, borderRadius: 999 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {missing ? t("eventOpenTulum") : t("retry")}
          </Text>
        </Button>
      </SafeAreaView>
    );
  }

  const start = Date.parse(event.date);
  const dateLabel = format(
    start,
    i18n.language === "EN" ? "EEEE, d MMM · h:mm aa" : "EEEE, d. MMM · HH:mm",
    { locale: dateLocale },
  );
  const goingLabel =
    event.guestCount > 0
      ? `${event.guestCount} ${t("going")}`
      : t("beTheFirst");
  // Whole minutes until Matches opens, rounded up: never "0 min" before it.
  const opensInMinutes = Math.max(
    1,
    Math.ceil((start - MATCHES_OPEN_BEFORE_START_MS - now) / 60_000),
  );
  const countdown =
    opensInMinutes >= 60
      ? t("countdownHoursMinutes", {
          hours: Math.floor(opensInMinutes / 60),
          minutes: opensInMinutes % 60,
        })
      : t("countdownMinutes", { minutes: opensInMinutes });

  // The one button at the bottom, for where the guest is.
  const primaryAction =
    phase === "ended"
      ? "seeWhatsOn"
      : joinStatus === "joining"
        ? "joining"
        : attending && phase === "live"
          ? "goToMatches"
          : attending
            ? "seeWhoIsGoing"
            : "join";
  const primaryLabel = {
    seeWhatsOn: t("eventSeeWhatsOn"),
    joining: t("eventJoining"),
    goToMatches: t("eventGoToMatches"),
    seeWhoIsGoing: t("eventSeeWhoIsGoing"),
    join: t("eventJoinCta"),
  }[primaryAction];
  const primaryDisabled =
    primaryAction === "joining" ||
    (primaryAction === "join" && joinStatus === "conflict");

  const onPrimaryPress = () => {
    if (primaryAction === "seeWhatsOn") router.replace("/");
    else if (primaryAction === "goToMatches") router.replace("/(tabs)/matches");
    else if (primaryAction === "seeWhoIsGoing")
      router.push(`/event-details/${event.id}`);
    else if (primaryAction === "join") onJoinPress();
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ height: 260 }} className="overflow-hidden">
          <Image
            source={{ uri: event.image || undefined }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
          {phase === "live" ? (
            <View className="absolute left-4 top-4 flex-row items-center rounded-full bg-black/60 px-3 py-1.5">
              <View className="h-2 w-2 rounded-full bg-[#a8ffb2]" />
              <Text className="ml-2 text-xs font-bold text-white">
                {t("eventLiveNow")}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-1 gap-3 px-5 pt-5">
          <Text className="text-[28px] font-black leading-[34px] text-light-gray12 dark:text-dark-gray12">
            {event.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <CalendarClock size={18} color={theme.gray10} />
            <Text className="flex-1 text-sm text-light-gray10 dark:text-dark-gray10">
              {dateLabel}
            </Text>
          </View>
          {event.venueName ? (
            <View className="flex-row items-center gap-2">
              <MapPin size={18} color={theme.gray10} />
              <Text className="flex-1 text-sm text-light-gray10 dark:text-dark-gray10">
                {event.venueName}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center gap-2">
            <Users size={18} color={theme.gray10} />
            <Text className="text-sm text-light-gray10 dark:text-dark-gray10">
              {goingLabel}
            </Text>
          </View>

          {phase === "ended" ? (
            <View className="mt-2 rounded-2xl bg-light-backgroundStrong p-4 dark:bg-dark-backgroundStrong">
              <Text className="text-base font-bold text-light-gray12 dark:text-dark-gray12">
                {t("eventEnded")}
              </Text>
              <Text className="mt-1 text-sm text-light-gray10 dark:text-dark-gray10">
                {t("eventEndedSubtitle")}
              </Text>
            </View>
          ) : attending ? (
            <View className="mt-2 rounded-2xl bg-light-backgroundStrong p-4 dark:bg-dark-backgroundStrong">
              <Text className="text-base font-bold text-light-gray12 dark:text-dark-gray12">
                {t("eventYoureGoing")}
              </Text>
              <Text className="mt-1 text-sm text-light-gray10 dark:text-dark-gray10">
                {phase === "live"
                  ? t("eventMatchingOpenNow")
                  : t("eventMatchingOpensIn", { time: countdown })}
              </Text>
            </View>
          ) : joinStatus === "conflict" && conflict ? (
            <View className="mt-2 rounded-2xl bg-light-backgroundStrong p-4 dark:bg-dark-backgroundStrong">
              <Text className="text-sm text-light-gray12 dark:text-dark-gray12">
                {t("eventSwitchQuestion", {
                  other: conflict.title,
                  event: event.title,
                })}
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {conflict.eventId ? (
                  <Button
                    onPress={() => void switchToThisEvent()}
                    className="rounded-full px-5"
                    style={{ backgroundColor: theme.color, borderRadius: 999 }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      {t("eventSwitch")}
                    </Text>
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onPress={keepOtherEvent}
                  className="rounded-full px-5"
                  style={{ borderRadius: 999 }}
                >
                  <Text className="font-semibold text-light-gray12 dark:text-dark-gray12">
                    {t("eventKeepOther", { other: conflict.title })}
                  </Text>
                </Button>
              </View>
            </View>
          ) : joinStatus === "failed" ? (
            <Text
              className="mt-2 text-sm"
              style={{ color: theme.destructiveForeground }}
            >
              {t("eventJoinFailed")}
            </Text>
          ) : !isSignedIn ? (
            <Text className="mt-2 text-sm text-light-gray10 dark:text-dark-gray10">
              {t("eventSignInToJoin")}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View className="px-5 pb-5 pt-3">
        <Button
          size="lg"
          disabled={primaryDisabled}
          onPress={onPrimaryPress}
          className="h-14 w-full rounded-full"
          style={{
            backgroundColor: theme.color,
            borderRadius: 999,
            opacity: primaryDisabled ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>
            {primaryLabel}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
