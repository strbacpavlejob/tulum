import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { mockedUser } from "@/mock/user";
import { Profile } from "@/types/profile";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, MapPin, SendHorizonal, X } from "lucide-react-native";
import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Image, Modal, Platform, TouchableOpacity, View } from "react-native";
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

interface MatchModalProps {
  visible: boolean;
  profile: Profile | null;
  onClose: () => void;
}

function ProfileCard({
  name,
  age,
  tags,
  location,
  image,
}: {
  name: string;
  age?: number;
  tags: string[];
  location?: string;
  image: string;
}) {
  return (
    <View className="relative w-36 h-48 overflow-hidden rounded-2xl shadow-lg">
      <Image
        source={{ uri: image }}
        className="absolute inset-0 w-full h-full"
        resizeMode="cover"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        style={{ position: "absolute", inset: 0 }}
      />
      <View className="absolute bottom-2 left-2 right-2">
        <Text className="text-sm font-bold leading-tight text-white">
          {name}
          {age !== undefined ? `, ${age}` : ""}
        </Text>
        {location && (
          <View className="mt-0.5 flex-row items-center gap-0.5">
            <MapPin size={12} color="rgba(255,255,255,0.8)" />
            <Text className="text-[9px] text-white/80">{location}</Text>
          </View>
        )}
        <View className="mt-1 flex-row flex-wrap gap-1">
          {tags.map((tag) => (
            <View key={tag} className="rounded-full bg-white/15 px-1.5 py-0.5">
              <Text className="text-[8px] text-white/80">{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
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
      Array.from({ length: numCircles }, (_, i) => ({
        size: baseSize + i * 56,
        opacity: Math.max(0.04, 0.22 - i * 0.03),
        delay: i * 80,
      })),
    [numCircles, baseSize],
  );

  return (
    <View className="w-screen aspect-square">
      {circles.map((circle, i) => (
        <RippleHeart
          key={i}
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
  }, []);

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
  const contentOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      contentOpacity.value = withSpring(1);
      contentScale.value = withSequence(withSpring(1.05), withSpring(1));
    } else {
      contentOpacity.value = 0;
      contentScale.value = 0.8;
    }
  }, [visible]);

  const containerAnim = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  if (!profile) return null;

  const userAvatar = mockedUser.imgUrl ?? "";
  const matchAvatar = profile.images[0];

  return (
    <Modal visible={visible} animationType="fade">
      <View className="flex-1 bg-black/85">
        {/* Background ripple */}
        <View className="absolute inset-0 justify-center items-center">
          <HeartRipple numCircles={6} baseSize={120} color={theme.primary} />
        </View>

        {/* Close button */}
        <TouchableOpacity
          className="absolute top-[52px] right-6 z-20 w-8 h-8 rounded-full bg-white/10 justify-center items-center"
          onPress={onClose}
          activeOpacity={0.7}
        >
          <X size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <Animated.View
          style={containerAnim}
          className="flex-1 justify-center items-center pt-[60px]"
        >
          {/* Profile Cards */}
          <View className="flex-row mb-4 z-10" style={{ width: 288 }}>
            <Avatar alt="Your avatar" className="size-40 ">
              <AvatarImage source={{ uri: userAvatar }} />
            </Avatar>
            <Avatar alt="Match avatar" className="size-40 -ml-10">
              <AvatarImage source={{ uri: matchAvatar }} />
            </Avatar>
          </View>

          {/* Text */}
          <Text className="text-5xl font-bold text-white mb-2 text-center tracking-[-1px]">
            {t("itsAMatch")}
          </Text>
          <Text className="text-sm text-white/50 text-center leading-5 max-w-[260px]">
            {t("youAndLikedEachOther", { name: profile.name })}
          </Text>
        </Animated.View>

        {/* Bottom message input */}
        <View className="px-5 pb-6 ios:pb-10 z-10">
          <View className="flex-row items-center justify-between bg-white/10 rounded-full px-5 py-[14px]">
            <Text className="text-base text-white/50">
              {t("saySomethingNice")}
            </Text>
            <SendHorizonal size={20} color="rgba(255,255,255,0.5)" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
