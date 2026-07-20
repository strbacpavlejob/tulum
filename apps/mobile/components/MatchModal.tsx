import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Profile } from "@/types/profile";
import * as Haptics from "expo-haptics";
import { Heart, SendHorizonal, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Platform, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Avatar, AvatarImage } from "./ui/avatar";
import useStore from "@/store/useStore";
import { Input } from "./ui/input";
import { useAuth } from "@clerk/expo";
import { fetchOrCreateChat } from "@/lib/api";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useRouter } from "expo-router";

interface MatchModalProps {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
}

function HeartRipple({
  numCircles = 6,
  baseSize = 120,
  color,
}: {
  numCircles?: number;
  baseSize?: number;
  color: string;
}) {
  const circles = useMemo(
    () =>
      Array.from({ length: numCircles }, (_, index) => ({
        size: baseSize + index * 56,
        opacity: Math.max(0.04, 0.22 - index * 0.03),
        delay: index * 80,
      })),
    [numCircles, baseSize],
  );

  return (
    <View className="aspect-square w-full">
      {circles.map((circle, index) => (
        <RippleHeart
          key={index}
          size={circle.size}
          baseOpacity={circle.opacity}
          delay={circle.delay}
          color={color}
        />
      ))}
    </View>
  );
}

function RippleHeart({
  size,
  baseOpacity,
  delay,
  color,
}: {
  size: number;
  baseOpacity: number;
  delay: number;
  color: string;
}) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(baseOpacity);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800 }),
          withTiming(0.85, { duration: 1800 }),
        ),
        -1,
        true,
      ),
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(baseOpacity * 1.3, { duration: 1800 }),
          withTiming(baseOpacity * 0.7, { duration: 1800 }),
        ),
        -1,
        true,
      ),
    );
  }, [baseOpacity, delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: -size / 2 },
      { translateY: -size / 2 },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: "50%",
          top: "50%",
          width: size,
          height: size,
        },
        animatedStyle,
      ]}
    >
      <Heart size={size} color={color} fill={color} />
    </Animated.View>
  );
}

export default function MatchModal({
  visible,
  profile,
  onClose,
}: MatchModalProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { user } = useStore();

  const { userId, getToken } = useAuth();
  const router = useRouter();

  const [text, setText] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const pendingSendRef = useRef<string | null>(null);

  const contentOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }

      contentOpacity.value = withSpring(1);
      contentScale.value = withSequence(withSpring(1.05), withSpring(1));
    } else {
      contentOpacity.value = 0;
      contentScale.value = 0.8;
    }
  }, [contentOpacity, contentScale, visible]);

  const containerAnim = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  const { connected, sendMessage } = useChatSocket(
    chatId ?? null,
    user?.id ?? null,
    [],
  );

  // When socket connects and we have a pending message, send it and navigate
  useEffect(() => {
    if (!connected) return;
    const pending = pendingSendRef.current;
    if (pending && sendMessage) {
      sendMessage(pending);
      pendingSendRef.current = null;
      setText("");
      setSending(false);
      // Open inbox so user can see the chat thread
      try {
        router.push("/inbox");
      } catch (e) {
        // ignore
      }
    }
  }, [connected, sendMessage, router]);

  if (!profile) {
    return null;
  }

  const userAvatar = user?.imgUrl ?? "";
  const matchAvatar = profile.images[0] ?? "";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{
          backgroundColor: "#1c1c1e",
        }}
      >
        {/* Background ripple */}
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <HeartRipple numCircles={6} baseSize={120} color={theme.primary} />
        </View>

        {/* Close button */}
        <TouchableOpacity
          className="absolute right-6 top-[52px] z-20 h-8 w-8 items-center justify-center rounded-full bg-white/10"
          onPress={onClose}
          activeOpacity={0.7}
        >
          <X size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Center content */}
        <View className="absolute inset-0 items-center justify-center pt-2">
          <Animated.View
            pointerEvents="box-none"
            style={containerAnim}
            className="absolute inset-0 items-center justify-center px-6"
          >
            <View className="mb-4 items-center justify-center">
              <View className="flex-row items-center justify-center">
                <Avatar
                  alt="Your avatar"
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 80,
                    zIndex: 2,
                  }}
                >
                  <AvatarImage
                    source={{ uri: matchAvatar }}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </Avatar>

                <Avatar
                  alt="Match avatar"
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 80,
                    marginLeft: -40,
                    zIndex: 1,
                  }}
                >
                  <AvatarImage
                    source={{ uri: userAvatar }}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </Avatar>
              </View>
            </View>

            <Text className="mb-2 text-center text-5xl font-bold tracking-[-1px] text-white">
              {t("itsAMatch")}
            </Text>

            <Text className="max-w-[260px] text-center text-sm leading-5 text-white/50">
              {t("youAndLikedEachOther", {
                name: profile.name,
              })}
            </Text>
          </Animated.View>
        </View>

        {/* Bottom message input */}
        <View className="absolute bottom-6 left-5 right-5 z-10 ios:bottom-10 flex-row items-center justify-between rounded-full bg-white/10 px-5 py-[14px] gap-2">
          <Input
            inputMode="text"
            value={text}
            onChangeText={setText}
            placeholder={t("saySomethingNice")}
            placeholderClassName="text-base text-white/50"
            className="flex-row items-center justify-between rounded-full bg-[transparent] px-5 py-[14px] border-0 focus:border-[transparent] focus:ring-0"
            style={{ color: theme.colorStrong }}
          />

          <TouchableOpacity
            onPress={async () => {
              const trimmed = (text ?? "").trim();
              if (!trimmed || sending || !profile) return;
              setSending(true);
              try {
                const token = await getToken();
                if (!token) {
                  setSending(false);
                  return;
                }

                // Ensure chat exists on the server
                const { chat } = await fetchOrCreateChat(profile.id, token);
                setChatId(chat.id);

                // Queue the message to be sent once socket connects
                pendingSendRef.current = trimmed;
              } catch (err) {
                setSending(false);
              }
            }}
            disabled={sending}
            accessibilityLabel="Send message"
          >
            <SendHorizonal size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
