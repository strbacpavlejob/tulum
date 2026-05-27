import FindModal from "@/components/FindModal";
import { useChatSocket } from "@/hooks/useChatSocket";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { Match, Message } from "@/types/chat";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { ArrowLeft, SendHorizontal, UserSearch } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  KeyboardEvent as RNKeyboardEvent,
  SafeAreaView,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import MatchProfileSheet from "./MatchProfileSheet";

type ChatModalProps = {
  match: Match;
  /** Authenticated user ID (from Clerk). When provided, enables real-time socket connection. */
  userId?: string | null;
  /** Pre-loaded initial messages from the API. Falls back to match.messages when absent. */
  initialMessages?: Message[];
  onBack: () => void;
};

const HEADER_HEIGHT = 64;
const HEADER_AVATAR_SIZE = 52;
const HEADER_RING_SIZE = 66;
const HEADER_STROKE_WIDTH = 3;
const TOTAL_WINDOW_MS = 6 * 60 * 60 * 1000;

function ringColor(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms < 60 * 60 * 1000) return "#ef4444";
  if (ms < 2 * 60 * 60 * 1000) return "#f97316";
  return "#22c55e";
}

function HeaderTimerRing({ expiresAt }: { expiresAt: Date }) {
  const size = HEADER_RING_SIZE;
  const radius = (size - HEADER_STROKE_WIDTH) / 2;
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
        strokeWidth={HEADER_STROKE_WIDTH}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={stroke}
        strokeWidth={HEADER_STROKE_WIDTH}
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

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: RNKeyboardEvent) =>
      setHeight(e?.endCoordinates?.height ?? 0);
    const onHide = () => setHeight(0);

    const s = Keyboard.addListener(showEvt, onShow);
    const h = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  return height;
}

function usePrevious<T>(value: T) {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

const RenderMessage = ({ item }: { item: Message }) => {
  const theme = useAppTheme();
  const isUser = item.isFromUser;

  return (
    <View
      style={{
        maxWidth: "75%",
        alignSelf: isUser ? "flex-end" : "flex-start",
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          fontSize: 17,
          lineHeight: 24,
          color: isUser ? theme.background : theme.gray10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 18,
          backgroundColor: isUser ? theme.color : theme.gray3,
          overflow: "hidden",
          ...(isUser
            ? { borderBottomRightRadius: 4 }
            : { borderBottomLeftRadius: 4 }),
        }}
      >
        {item.text}
      </Text>
    </View>
  );
};

export default function ChatModal({
  match,
  userId,
  initialMessages,
  onBack,
}: ChatModalProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [showFind, setShowFind] = useState(false);
  const matchProfileSheetRef = useRef<BottomSheetModal>(null);
  const [newMessage, setNewMessage] = useState("");

  const listRef = useRef<FlatList<Message>>(null);

  const {
    messages: socketMessages,
    sendMessage,
    sendTyping,
  } = useChatSocket(
    match.chatId ?? null,
    userId ?? null,
    initialMessages ?? match.messages,
  );

  const messages = useMemo(
    () => [...socketMessages].reverse(),
    [socketMessages],
  );

  const prevLen = usePrevious(messages.length);

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated });
    });
  };

  const keyboardHeight = useKeyboardHeight();
  const keyboardVisible = keyboardHeight > 0;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setTimeout(() => scrollToBottom(true), 50),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setTimeout(() => scrollToBottom(true), 50),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (prevLen === undefined) {
      scrollToBottom(false);
    } else if (messages.length > prevLen) {
      setTimeout(() => scrollToBottom(true), 20);
    }
  }, [messages.length, prevLen]);

  const handleContentSizeChange = () => {
    scrollToBottom(false);
  };

  const onViewableItemsChanged = useRef(
    (_: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {},
  );

  const [inputHeight, setInputHeight] = useState(0);
  const onInputLayout = (e: LayoutChangeEvent) => {
    const h = e?.nativeEvent?.layout?.height ?? 0;
    setInputHeight(h);
  };

  const listBottomPadding =
    inputHeight + (keyboardVisible ? keyboardHeight : 0) + 8;

  if (showFind) {
    return <FindModal onClose={() => setShowFind(false)} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? HEADER_HEIGHT + insets.top : 0
        }
      >
        <View className="flex-1" style={{ backgroundColor: theme.background }}>
          {/* Header */}
          <View
            className="flex-row items-center px-4 py-3"
            style={{ borderBottomWidth: 1, borderColor: theme.gray3 }}
          >
            <Pressable
              className="w-8 h-8 rounded-full items-center justify-center"
              onPress={onBack}
              accessibilityLabel="Back"
            >
              <ArrowLeft size={24} color={theme.gray12} />
            </Pressable>

            <View className="flex-row items-center flex-1 ml-3 gap-3">
              <Pressable
                onPress={() => matchProfileSheetRef.current?.present()}
                style={{ width: HEADER_RING_SIZE, height: HEADER_RING_SIZE }}
              >
                <Image
                  source={{ uri: match.photo }}
                  style={{
                    width: HEADER_AVATAR_SIZE,
                    height: HEADER_AVATAR_SIZE,
                    borderRadius: HEADER_AVATAR_SIZE / 2,
                    margin: (HEADER_RING_SIZE - HEADER_AVATAR_SIZE) / 2,
                  }}
                  contentFit="cover"
                  cachePolicy="disk"
                />
                <HeaderTimerRing expiresAt={match.expiresAt} />
              </Pressable>
              <View>
                <Text
                  style={{
                    color: theme.gray12,
                    fontWeight: "600",
                    fontSize: 18,
                  }}
                >
                  {match.name}
                </Text>
                <Text
                  style={{
                    color: theme.gray10,
                    fontSize: 14,
                    marginTop: 2,
                  }}
                >
                  {t("atVenue", { venue: match.venue })}
                </Text>
              </View>
            </View>

            <Pressable className="p-4" onPress={() => setShowFind(true)}>
              <UserSearch size={28} color={theme.gray10} />
            </Pressable>
          </View>

          {/* Messages */}
          <View
            className="flex-1"
            style={{ backgroundColor: theme.background }}
          >
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => <RenderMessage item={item} />}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: listBottomPadding,
                flexGrow: 1,
                justifyContent: "flex-end",
              }}
              showsVerticalScrollIndicator={false}
              inverted
              onContentSizeChange={handleContentSizeChange}
              onViewableItemsChanged={onViewableItemsChanged.current}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
            />
          </View>

          {/* Input */}
          <View
            style={{
              paddingBottom: insets.bottom,
              backgroundColor: theme.background,
              borderTopWidth: 1,
              borderColor: theme.gray3,
            }}
            onLayout={onInputLayout}
          >
            <View className="px-6 py-4">
              <View
                className="flex-row items-center"
                style={{
                  backgroundColor: theme.gray3,
                  borderRadius: 999,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                }}
              >
                <Textarea
                  className="flex-1 border-0 shadow-none rounded-none min-h-0"
                  style={{
                    fontSize: 17,
                    color: theme.gray12,
                    padding: 0,
                    maxHeight: 100,
                  }}
                  placeholder={t("typeAMessage")}
                  placeholderTextColor={theme.gray10}
                  value={newMessage}
                  onChangeText={(text) => {
                    setNewMessage(text);
                    sendTyping(text.length > 0);
                  }}
                  onFocus={() => setTimeout(() => scrollToBottom(true), 50)}
                />
                <Pressable
                  disabled={!newMessage.trim()}
                  onPress={() => {
                    const text = newMessage.trim();
                    if (!text) return;
                    sendMessage(text);
                    setNewMessage("");
                    sendTyping(false);
                    setTimeout(() => scrollToBottom(true), 50);
                  }}
                >
                  <SendHorizontal
                    size={20}
                    color={newMessage.trim() ? theme.color : theme.gray10}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <MatchProfileSheet match={match} sheetRef={matchProfileSheetRef} />
    </SafeAreaView>
  );
}
