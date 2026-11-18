import ChatModal from "@/components/ChatModal";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useTranslation } from "react-i18next";
import {
  ChatUnavailableError,
  fetchMyMatches,
  fetchMyTickets,
  fetchOrCreateChat,
  type ChatMessage,
} from "@/lib/api";
import { getUnreadChatsCount, markMatchAsRead } from "@/lib/inboxUnread";
import type { Match, Message } from "@/types/chat";
import { useAuth } from "@clerk/expo";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import LoadingIndicator from "@/components/loading-indicator";
import EmptyIndicator from "@/components/EmptyIndicator";
import { useFocusEffect, useRouter } from "expo-router";
import useStore from "@/store/useStore";
import { haversineMeters } from "@/lib/geo";
import { isChatExpired, mapToMatch } from "@/components/inbox/inboxModel";
import { EmptyChatIllustration } from "@/components/inbox/EmptyChatIllustration";
import { NewMatchBubble } from "@/components/inbox/NewMatchBubble";
import {
  PROXIMITY_RADIUS_M,
  LOCATION_POLL_INTERVAL_MS,
  LocationGateScreen,
} from "@/components/inbox/LocationGateScreen";
import { ChatListItem } from "@/components/inbox/ChatListItem";

// ── Constants ──────────────────────────────────────────────────────────────────

// ── Helpers ────────────────────────────────────────────────────────────────────

// ── TimerRing ──────────────────────────────────────────────────────────────────

// ── NewMatchBubble ─────────────────────────────────────────────────────────────

// ── LocationGateScreen ─────────────────────────────────────────────────────────

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const setInboxUnreadCount = useStore((s) => s.setInboxUnreadCount);
  const inboxVersion = useStore(
    (s: { inboxVersion: number }) => s.inboxVersion,
  );

  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatches, setNewMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedInitialMessages, setSelectedInitialMessages] = useState<
    Message[]
  >([]);
  const [, setCurrentTime] = useState(new Date());

  // ── Location gate state ────────────────────────────────────────────────────
  const [locationPendingMatch, setLocationPendingMatch] =
    useState<Match | null>(null);
  const [locationVenueCoords, setLocationVenueCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "required">(
    "idle",
  );
  const locationPendingMatchRef = useRef<Match | null>(null);
  const locationVenueCoordsRef = useRef<{ lat: number; lng: number } | null>(
    null,
  );

  const loadMatches = useCallback(async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      if (!token) return;
      const items = await fetchMyMatches(token);

      const active: Match[] = [];
      const fresh: Match[] = [];
      for (const item of items) {
        const mapped = mapToMatch(item);
        if (!item.has_messages) {
          // No messages yet → show in "New Matches" bubbles. That includes a
          // chat that was opened but has nothing in it yet. Keep the whole
          // match: opening a bubble needs the same data as a Messages row.
          fresh.push(mapped);
        } else {
          active.push(mapped);
        }
      }

      const unreadCount = await getUnreadChatsCount(items, userId);
      setInboxUnreadCount(unreadCount);
      setMatches(active);
      setNewMatches(fresh);
    } catch {
      // Keep empty state on error
    } finally {
      setLoading(false);
    }
  }, [setInboxUnreadCount, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // On focus, and when a pushed change bumps inboxVersion while the inbox is
  // open; a change while it is closed is read when it is next focused.
  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [inboxVersion, loadMatches]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // A match you blocked or reported, or whose chat a block closed: the API
  // no longer lists it, so drop it here too.
  const removeMatch = (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    setNewMatches((prev) => prev.filter((m) => m.id !== matchId));
  };

  const openMatch = async (match: Match) => {
    if (!userId) return;
    const token = await getToken();
    if (!token) return;
    setOpeningChat(true);
    try {
      const { chat, messages: apiMessages } = await fetchOrCreateChat(
        match.id, // match DB id — endpoint is /chats/by-match/:matchId
        token,
      );
      const mapped: Message[] = apiMessages.map((m: ChatMessage) => ({
        id: String(m.id),
        text: m.text,
        timestamp: new Date(m.sent_at),
        isFromUser: m.sender_id === userId,
      }));
      await markMatchAsRead(match.id);
      setInboxUnreadCount(
        Math.max(0, useStore.getState().inboxUnreadCount - 1),
      );
      setSelectedInitialMessages(mapped);
      setSelectedMatch({ ...match, chatId: chat.id });
    } catch (error) {
      if (error instanceof ChatUnavailableError) {
        removeMatch(match.id);
        toast.error(t("chatUnavailable"));
        return;
      }
      // API unavailable — open without chatId, socket won't connect but UI shows
      setSelectedInitialMessages(match.messages);
      setSelectedMatch(match);
    } finally {
      setOpeningChat(false);
    }
  };

  // ── GPS proximity check for chat access ────────────────────────────────────
  const checkChatLocation = useCallback(
    async (match: Match) => {
      const venueLat = match.venueLat;
      const venueLng = match.venueLng;

      // No coordinates → skip location check
      if (venueLat == null || venueLng == null) {
        await openMatch(match);
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          await openMatch(match);
          return;
        }

        // Check if the event is currently live via tickets
        const tickets = await fetchMyTickets(token, userId!);
        const now = Date.now();
        const liveTicket = tickets.find((tk: any) => {
          const start = tk.date ? new Date(tk.date).getTime() : null;
          const end = tk.end_date_time
            ? new Date(tk.end_date_time).getTime()
            : null;
          return (
            String(tk.event_id) === String(match.eventId) &&
            start !== null &&
            end !== null &&
            now >= start &&
            now <= end
          );
        });

        if (!liveTicket) {
          // Event not currently live — allow chat without location check
          await openMatch(match);
          return;
        }

        // Event is live — verify GPS proximity
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          // No permission — block with location map
          setLocationPendingMatch(match);
          locationPendingMatchRef.current = match;
          setLocationVenueCoords({ lat: venueLat, lng: venueLng });
          locationVenueCoordsRef.current = { lat: venueLat, lng: venueLng };
          setLocationStatus("required");
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        const dist = haversineMeters(latitude, longitude, venueLat, venueLng);
        if (dist <= PROXIMITY_RADIUS_M) {
          // Close enough — open chat
          setLocationStatus("idle");
          setLocationPendingMatch(null);
          locationPendingMatchRef.current = null;
          await openMatch(match);
        } else {
          // Too far — show location map
          setLocationPendingMatch(match);
          locationPendingMatchRef.current = match;
          setLocationVenueCoords({ lat: venueLat, lng: venueLng });
          locationVenueCoordsRef.current = { lat: venueLat, lng: venueLng };
          setLocationStatus("required");
        }
      } catch {
        // Fallback: allow chat on any error
        await openMatch(match);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId],
  );

  // Re-check location automatically while on location_required screen
  useEffect(() => {
    if (locationStatus !== "required") return;
    const id = setInterval(async () => {
      const pending = locationPendingMatchRef.current;
      const venueCoords = locationVenueCoordsRef.current;
      if (!pending || !venueCoords) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        const dist = haversineMeters(
          latitude,
          longitude,
          venueCoords.lat,
          venueCoords.lng,
        );
        if (dist <= PROXIMITY_RADIUS_M) {
          setLocationStatus("idle");
          setLocationPendingMatch(null);
          locationPendingMatchRef.current = null;
          await openMatch(pending);
        }
      } catch {
        // ignore polling errors
      }
    }, LOCATION_POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationStatus]);

  // An expired match can't be opened from either the New Matches strip or the
  // Messages list. The check runs at tap time, because the list only
  // re-renders once a minute. A toast, not Alert.alert: Alert.alert does
  // nothing on web.
  const showChatExpired = () => {
    toast.error(t("chatExpiredTitle"), {
      description: t("chatExpiredDescription"),
    });
  };

  const openNewMatch = (match: Match) => {
    if (isChatExpired(match.expiresAt)) {
      showChatExpired();
      return;
    }
    setNewMatches((prev) => prev.filter((m) => m.id !== match.id));
    setMatches((prev) => [match, ...prev]);
    checkChatLocation(match);
  };

  if (loading || openingChat) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <LoadingIndicator />
      </View>
    );
  }

  const renderChatItem = ({ item }: { item: Match }) => (
    <ChatListItem
      item={item}
      onOpen={checkChatLocation}
      onExpired={showChatExpired}
    />
  );

  if (selectedMatch) {
    return (
      <ChatModal
        match={selectedMatch}
        userId={userId}
        initialMessages={selectedInitialMessages}
        onBack={() => {
          setSelectedMatch(null);
          setSelectedInitialMessages([]);
        }}
        onBlocked={() => {
          removeMatch(selectedMatch.id);
          setSelectedMatch(null);
          setSelectedInitialMessages([]);
        }}
      />
    );
  }

  // ── Location gate — shown when user tries to open a chat but is not at the venue ──
  if (
    locationStatus === "required" &&
    locationPendingMatch &&
    locationVenueCoords
  ) {
    return (
      <LocationGateScreen
        venueLat={locationVenueCoords.lat}
        venueLng={locationVenueCoords.lng}
        userLat={userCoords?.lat}
        userLng={userCoords?.lng}
        venueName={locationPendingMatch.venue}
        onCheckLocation={() => checkChatLocation(locationPendingMatch)}
        onBack={() => {
          setLocationStatus("idle");
          setLocationPendingMatch(null);
          locationPendingMatchRef.current = null;
        }}
      />
    );
  }

  if (matches.length === 0 && newMatches.length === 0) {
    return (
      <View className="flex-1 flex-col justify-center items-center bg-light-background dark:bg-dark-background">
        <SafeAreaView className="flex-1">
          <EmptyIndicator
            title={t("noMessagesYet")}
            subtitle={t("noMessagesYetSubtitle")}
            picture={() => <EmptyChatIllustration />}
            onPress={() => router.push("/matches")}
            buttonText={t("noMessagesYetButton")}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      {/* ── New Matches strip ─────────────────────────────────────────────── */}
      {newMatches.length > 0 && (
        <View className="border-b border-light-gray3 pb-4 pt-3 dark:border-dark-gray3">
          <Text className="mb-3 px-4 text-[13px] font-bold tracking-[0.5px] text-light-gray10 dark:text-dark-gray10">
            {t("newMatches").toUpperCase()} · {newMatches.length}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {newMatches.map((nm) => (
              <NewMatchBubble
                key={nm.id}
                match={nm}
                textColor={theme.gray12}
                onPress={() => openNewMatch(nm)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Messages header ───────────────────────────────────────────────── */}
      <View className="border-b border-light-gray3 px-4 py-2 dark:border-dark-gray3">
        <Text className="text-[13px] font-bold tracking-[0.5px] text-light-gray10 dark:text-dark-gray10">
          {t("messages").toUpperCase()} · {matches.length}
        </Text>
      </View>

      {/* ── Chat list ─────────────────────────────────────────────────────── */}
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
