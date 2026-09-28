import ChatModal from "@/components/ChatModal";
import { MatchLocationMap } from "@/components/MatchLocationMap";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useTranslation } from "react-i18next";
import {
  fetchMyMatches,
  fetchMyTickets,
  fetchOrCreateChat,
  type ChatMessage,
  type MatchListItem,
} from "@/lib/api";
import { getUnreadChatsCount, markMatchAsRead } from "@/lib/inboxUnread";
import type { Match, Message, NewMatch } from "@/types/chat";
import { useAuth } from "@clerk/expo";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import LoadingIndicator from "@/components/loading-indicator";
import EmptyIndicator from "@/components/EmptyIndicator";
import { useFocusEffect, useRouter } from "expo-router";
import ChatIcon from "@/components/illustrations/Chat";
import useStore from "@/store/useStore";

// ── Constants ──────────────────────────────────────────────────────────────────

const CHAT_AVATAR_SIZE = 54;
const CHAT_RING_SIZE = 68;
const MATCH_AVATAR_SIZE = 52;
const MATCH_RING_SIZE = 66;
const STROKE_WIDTH = 3;
const TOTAL_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Metres within which the user is considered "at the venue" for chat access */
const PROXIMITY_RADIUS_M = 300;

/** How often (ms) to re-check position on the location verification screen */
const LOCATION_POLL_INTERVAL_MS = 5_000;

// ── Helpers ────────────────────────────────────────────────────────────────────

function haversineMeters(
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

function ringColor(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms < 60 * 60 * 1000) return "#ef4444";
  if (ms < 2 * 60 * 60 * 1000) return "#f97316";
  return "#22c55e";
}

function formatTimeRemaining(expiresAt: Date): string {
  const diff = expiresAt.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatLastMessageTime(timestamp: Date): string {
  const diff = Date.now() - timestamp.getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return "now";
}

function mapToMatch(item: MatchListItem): Match {
  const matchedAt = new Date(item.matched_at);
  const expiresAt = new Date(matchedAt.getTime() + 6 * 60 * 60 * 1000);
  const photo =
    item.other_guest.picture_urls[0] ?? item.other_guest.avatar_url ?? "";
  const firstName = item.other_guest.first_name ?? "Unknown";
  const birthday = item.other_guest.birthday
    ? new Date(item.other_guest.birthday)
    : null;
  const age = birthday
    ? Math.floor(
        (Date.now() - birthday.getTime()) / (365.25 * 24 * 3600 * 1000),
      )
    : 0;
  return {
    id: String(item.id),
    chatId: item.chat_id ?? undefined,
    eventId: item.event?.id ?? undefined,
    venueLat: item.event?.venue_lat ?? null,
    venueLng: item.event?.venue_lng ?? null,
    name: firstName,
    age,
    photo,
    venue: item.event?.venue_name ?? item.event?.title ?? "Unknown venue",
    lastMessage: item.last_message?.text ?? "",
    lastMessageTime: item.last_message
      ? new Date(item.last_message.sent_at)
      : matchedAt,
    expiresAt,
    messages: [],
  };
}

// ── TimerRing ──────────────────────────────────────────────────────────────────

function TimerRing({ expiresAt, size }: { expiresAt: Date; size: number }) {
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const timeLeft = Math.max(0, expiresAt.getTime() - Date.now());
  const progress = Math.min(1, timeLeft / TOTAL_WINDOW_MS);
  const strokeDashoffset = circumference * (1 - progress);
  const stroke = ringColor(expiresAt);

  return (
    <Svg
      width={size}
      height={size}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(0,0,0,0.1)"
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation={-90}
        originX={size / 2}
        originY={size / 2}
      />
    </Svg>
  );
}

// ── NewMatchBubble ─────────────────────────────────────────────────────────────

function NewMatchBubble({
  match,
  textColor,
  onPress,
}: {
  match: NewMatch;
  textColor: string;
  onPress: () => void;
}) {
  const avatarMargin = (MATCH_RING_SIZE - MATCH_AVATAR_SIZE) / 2;

  return (
    <Pressable
      onPress={onPress}
      style={{ alignItems: "center", marginRight: 20, width: MATCH_RING_SIZE }}
    >
      <View style={{ width: MATCH_RING_SIZE, height: MATCH_RING_SIZE }}>
        <Image
          source={{ uri: match.photo }}
          style={{
            width: MATCH_AVATAR_SIZE,
            height: MATCH_AVATAR_SIZE,
            borderRadius: MATCH_AVATAR_SIZE / 2,
            margin: avatarMargin,
          }}
          contentFit="cover"
          cachePolicy="disk"
        />
        <TimerRing expiresAt={match.expiresAt} size={MATCH_RING_SIZE} />
      </View>
      <Text
        style={{ fontSize: 12, marginTop: 5, color: textColor }}
        numberOfLines={1}
      >
        {match.name}
      </Text>
    </Pressable>
  );
}

// ── LocationGateScreen ─────────────────────────────────────────────────────────

function LocationGateScreen({
  venueLat,
  venueLng,
  userLat,
  userLng,
  venueName,
  onCheckLocation,
  onBack,
}: {
  venueLat: number;
  venueLng: number;
  userLat: number;
  userLng: number;
  venueName: string;
  onCheckLocation: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      {/* Full-screen map */}
      <MatchLocationMap
        venueLat={venueLat}
        venueLng={venueLng}
        userLat={userLat}
        userLng={userLng}
      />

      {/* Overlay card */}
      <View
        className="gap-2 rounded-[20px] bg-light-backgroundStrong p-5 dark:bg-dark-backgroundStrong"
        style={{
          position: "absolute",
          top: insets.top + 16,
          left: 16,
          right: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text className="text-[18px] font-bold leading-[26px] text-light-color dark:text-dark-color">
          {t("chatLocationRequired")}
        </Text>
        <Text className="text-[13px] leading-5 text-light-gray10 dark:text-dark-gray10">
          {t("chatLocationRequiredSubtitle")}
        </Text>
        <View className="mt-1 flex-row gap-2">
          <TouchableOpacity
            onPress={onCheckLocation}
            className="rounded-full bg-light-color px-5 py-2.5 dark:bg-dark-color"
          >
            <Text className="text-[13px] font-semibold text-light-background dark:text-dark-background">
              {t("matchesCheckLocation")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onBack}
            className="rounded-full bg-light-gray3 px-5 py-2.5 dark:bg-dark-gray3"
          >
            <Text className="text-[13px] font-semibold text-light-gray10 dark:text-dark-gray10">
              {t("back")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legend */}
      <View
        className="flex-row gap-4 rounded-[14px] bg-light-backgroundStrong p-[14px] dark:bg-dark-backgroundStrong"
        style={{
          position: "absolute",
          bottom: insets.bottom + 24,
          left: 16,
          right: 16,
        }}
      >
        <View className="flex-row items-center gap-2">
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "#3b82f6",
              borderWidth: 2,
              borderColor: "white",
            }}
          />
          <Text className="text-xs text-light-gray10 dark:text-dark-gray10">
            {t("matchesYourLocation")}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-light-color dark:bg-dark-color" />
          <Text className="text-xs text-light-gray10 dark:text-dark-gray10">
            {venueName || t("matchesEventVenue")}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const setInboxUnreadCount = useStore((s) => s.setInboxUnreadCount);

  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatches, setNewMatches] = useState<NewMatch[]>([]);
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

      // Some backends can temporarily return stale has_messages/chat_id fields.
      // Probe chat activity for "fresh" matches so existing conversations still
      // appear in the messages list.
      const activityByMatchId = new Map<
        string,
        {
          chatId: string;
          lastMessageId: string;
          lastMessageText: string;
          lastMessageSenderId: string;
          lastMessageSentAt: string;
        }
      >();

      await Promise.all(
        items.map(async (item) => {
          const hasActivityFromMatches =
            item.has_messages ||
            Boolean(item.last_message) ||
            Boolean(item.chat_id);
          if (hasActivityFromMatches) return;

          try {
            const opened = await fetchOrCreateChat(item.id, token);
            const last = opened.messages[opened.messages.length - 1];
            if (last) {
              activityByMatchId.set(String(item.id), {
                chatId: opened.chat.id,
                lastMessageId: String(last.id),
                lastMessageText: last.text,
                lastMessageSenderId: last.sender_id,
                lastMessageSentAt: last.sent_at,
              });
            }
          } catch {
            // Ignore per-item fallback errors and rely on /matches/mine fields.
          }
        }),
      );

      const active: Match[] = [];
      const fresh: NewMatch[] = [];
      for (const item of items) {
        const activityHint = activityByMatchId.get(String(item.id));
        const mapped = mapToMatch(item);
        if (activityHint) {
          mapped.chatId = activityHint.chatId;
          mapped.lastMessage = activityHint.lastMessageText;
          mapped.lastMessageTime = new Date(activityHint.lastMessageSentAt);
        }
        const hasChatActivity =
          item.has_messages ||
          Boolean(item.last_message) ||
          Boolean(item.chat_id) ||
          Boolean(activityHint);
        if (!hasChatActivity) {
          // No messages yet → show in "New Matches" bubbles
          fresh.push({
            id: mapped.id,
            name: mapped.name,
            age: mapped.age,
            photo: mapped.photo,
            venue: mapped.venue,
            expiresAt: mapped.expiresAt,
          });
        } else {
          active.push(mapped);
        }
      }

      const hydratedItems: MatchListItem[] = items.map((item) => {
        const activityHint = activityByMatchId.get(String(item.id));
        if (!activityHint) return item;
        return {
          ...item,
          chat_id: activityHint.chatId,
          has_messages: true,
          last_message: {
            id: activityHint.lastMessageId,
            text: activityHint.lastMessageText,
            sender_id: activityHint.lastMessageSenderId,
            sent_at: activityHint.lastMessageSentAt,
          },
        };
      });

      const unreadCount = await getUnreadChatsCount(hydratedItems, userId);
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

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches]),
  );

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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
    } catch {
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

  const openNewMatch = (nm: NewMatch) => {
    const asMatch: Match = {
      id: nm.id,
      name: nm.name,
      age: nm.age,
      photo: nm.photo,
      venue: nm.venue,
      lastMessage: "",
      lastMessageTime: new Date(),
      expiresAt: nm.expiresAt,
      messages: [],
    };
    setNewMatches((prev) => prev.filter((m) => m.id !== nm.id));
    setMatches((prev) => [asMatch, ...prev]);
    checkChatLocation(asMatch);
  };

  if (loading || openingChat) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <LoadingIndicator />
      </View>
    );
  }

  const renderChatItem = ({ item }: { item: Match }) => {
    const timeRemaining = formatTimeRemaining(item.expiresAt);
    const isExpired = timeRemaining === "Expired";
    const expiryColor = isExpired ? theme.gray10 : ringColor(item.expiresAt);
    const avatarMargin = (CHAT_RING_SIZE - CHAT_AVATAR_SIZE) / 2;

    return (
      <Pressable
        style={{ opacity: isExpired ? 0.5 : 1 }}
        onPress={() => {
          if (isExpired) {
            Alert.alert(t("chatExpiredTitle"), t("chatExpiredDescription"));
            return;
          }
          checkChatLocation(item);
        }}
      >
        <View className="flex-row items-center gap-3 border-b border-light-gray3 px-4 py-3 dark:border-dark-gray3">
          <View style={{ width: CHAT_RING_SIZE, height: CHAT_RING_SIZE }}>
            <Image
              source={{ uri: item.photo }}
              style={{
                width: CHAT_AVATAR_SIZE,
                height: CHAT_AVATAR_SIZE,
                borderRadius: CHAT_AVATAR_SIZE / 2,
                margin: avatarMargin,
              }}
              contentFit="cover"
              cachePolicy="disk"
            />
            <TimerRing expiresAt={item.expiresAt} size={CHAT_RING_SIZE} />
          </View>

          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-light-gray12 dark:text-dark-gray12">
                {item.name}
              </Text>
              <Text className="text-[13px] text-light-gray10 dark:text-dark-gray10">
                {formatLastMessageTime(item.lastMessageTime)}
              </Text>
            </View>

            <Text className="mb-px text-sm text-light-gray10 dark:text-dark-gray10">
              at {item.venue}
            </Text>

            <View className="flex-row items-center justify-between">
              <Text
                className="flex-1 text-[15px] text-light-gray10 dark:text-dark-gray10"
                numberOfLines={1}
              >
                {item.lastMessage || t("sayHello")}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: expiryColor,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                {timeRemaining}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

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
        userLat={userCoords?.lat ?? locationVenueCoords.lat + 0.003}
        userLng={userCoords?.lng ?? locationVenueCoords.lng + 0.003}
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
            picture={ChatIcon}
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
