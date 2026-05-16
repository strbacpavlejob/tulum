import ChatModal from "@/components/ChatModal";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useTranslation } from "react-i18next";
import {
  fetchMyMatches,
  fetchOrCreateChat,
  type ChatMessage,
  type MatchListItem,
} from "@/lib/api";
import type { Match, Message, NewMatch } from "@/types/chat";
import { useAuth } from "@clerk/expo";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

// ── Constants ──────────────────────────────────────────────────────────────────

const CHAT_AVATAR_SIZE = 54;
const CHAT_RING_SIZE = 68;
const MATCH_AVATAR_SIZE = 52;
const MATCH_RING_SIZE = 66;
const STROKE_WIDTH = 3;
const TOTAL_WINDOW_MS = 6 * 60 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────────────────

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
        origin={`${size / 2}, ${size / 2}`}
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
          resizeMode="cover"
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

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function InboxScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { userId } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatches, setNewMatches] = useState<NewMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedInitialMessages, setSelectedInitialMessages] = useState<
    Message[]
  >([]);
  const [, setCurrentTime] = useState(new Date());

  const loadMatches = useCallback(async () => {
    if (!userId) return;
    try {
      const items = await fetchMyMatches(userId);
      const active: Match[] = [];
      const fresh: NewMatch[] = [];
      for (const item of items) {
        const mapped = mapToMatch(item);
        if (!item.has_messages) {
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
      setMatches(active);
      setNewMatches(fresh);
    } catch {
      // Keep empty state on error
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const openMatch = async (match: Match) => {
    if (!userId) return;
    setOpeningChat(true);
    try {
      const { chat, messages: apiMessages } = await fetchOrCreateChat(
        match.id, // match DB id — endpoint is /chats/by-match/:matchId
        userId,
      );
      const mapped: Message[] = apiMessages.map((m: ChatMessage) => ({
        id: String(m.id),
        text: m.text,
        timestamp: new Date(m.sent_at),
        isFromUser: m.sender_id === userId,
      }));
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
    openMatch(asMatch);
  };

  if (loading || openingChat) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator color={theme.color} />
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
          openMatch(item);
        }}
      >
        <View
          className="flex-row items-center gap-3 px-4 py-3"
          style={{ borderBottomWidth: 1, borderColor: theme.gray3 }}
        >
          <View style={{ width: CHAT_RING_SIZE, height: CHAT_RING_SIZE }}>
            <Image
              source={{ uri: item.photo }}
              style={{
                width: CHAT_AVATAR_SIZE,
                height: CHAT_AVATAR_SIZE,
                borderRadius: CHAT_AVATAR_SIZE / 2,
                margin: avatarMargin,
              }}
              resizeMode="cover"
            />
            <TimerRing expiresAt={item.expiresAt} size={CHAT_RING_SIZE} />
          </View>

          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center justify-between">
              <Text
                style={{ color: theme.gray12, fontWeight: "600", fontSize: 17 }}
              >
                {item.name}
              </Text>
              <Text style={{ color: theme.gray10, fontSize: 13 }}>
                {formatLastMessageTime(item.lastMessageTime)}
              </Text>
            </View>

            <Text
              style={{ color: theme.gray10, fontSize: 14, marginBottom: 1 }}
            >
              at {item.venue}
            </Text>

            <View className="flex-row items-center justify-between">
              <Text
                style={{ color: theme.gray10, fontSize: 15, flex: 1 }}
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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* ── New Matches strip ─────────────────────────────────────────────── */}
      {newMatches.length > 0 && (
        <View
          style={{ borderBottomWidth: 1, borderColor: theme.gray3 }}
          className="pt-3 pb-4"
        >
          <Text
            className="px-4 mb-3"
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: theme.gray10,
              letterSpacing: 0.5,
            }}
          >
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
      <View
        className="px-4 py-2"
        style={{ borderBottomWidth: 1, borderColor: theme.gray3 }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: theme.gray10,
            letterSpacing: 0.5,
          }}
        >
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
