import ChatModal from "@/components/ChatModal";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { mockMatches, mockNewMatches } from "@/mock/chat";
import type { Match, NewMatch } from "@/types/chat";
import React, { useEffect, useState } from "react";
import {
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

  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [newMatches, setNewMatches] = useState<NewMatch[]>(mockNewMatches);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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
    setSelectedMatch(asMatch);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedMatch) return;

    const message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      timestamp: new Date(),
      isFromUser: true,
    };

    const updatedMatch: Match = {
      ...selectedMatch,
      messages: [...selectedMatch.messages, message],
      lastMessage: message.text,
      lastMessageTime: message.timestamp,
    };

    setMatches((prev) =>
      prev.map((m) => (m.id === selectedMatch.id ? updatedMatch : m)),
    );
    setSelectedMatch(updatedMatch);
    setNewMessage("");

    setTimeout(
      () => {
        const responses = [
          "That's interesting! Tell me more 😊",
          "I totally agree with you!",
          "Haha, you're funny! 😄",
          "That sounds amazing!",
          "I'd love to hear more about that",
          "You seem really cool!",
        ];
        const response = {
          id: (Date.now() + 1).toString(),
          text: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
          isFromUser: false,
        };

        setMatches((prev) =>
          prev.map((m) =>
            m.id === selectedMatch.id
              ? {
                  ...m,
                  messages: [...m.messages, response],
                  lastMessage: response.text,
                  lastMessageTime: response.timestamp,
                }
              : m,
          ),
        );
        setSelectedMatch((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, response],
                lastMessage: response.text,
                lastMessageTime: response.timestamp,
              }
            : null,
        );
      },
      2000 + Math.random() * 1000,
    );
  };

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
            Alert.alert(
              "Chat Expired",
              "This conversation has expired and can no longer be accessed.",
            );
            return;
          }
          setSelectedMatch(item);
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
                {item.lastMessage || "Say hello!"}
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
        currentTime={new Date()}
        newMessage={newMessage}
        onChangeMessage={setNewMessage}
        onSend={sendMessage}
        onBack={() => setSelectedMatch(null)}
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
            NEW MATCHES · {newMatches.length}
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
          MESSAGES · {matches.length}
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
