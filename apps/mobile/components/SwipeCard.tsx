import { Text } from "@/components/ui/text";
import { Profile } from "@/types/profile";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin } from "lucide-react-native";
import React, { useState } from "react";
import { Image } from "expo-image";
import { Dimensions, Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import Tags from "./Tags";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.9;
const CARD_HEIGHT = screenHeight * 0.7;
const SWIPE_THRESHOLD = screenWidth * 0.25;

interface SwipeCardProps {
  profile: Profile;
  onSwipeLeft: (profile: Profile) => void;
  onSwipeRight: (profile: Profile) => void;
  index: number;
  totalCards: number;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export default function SwipeCard({
  profile,
  onSwipeLeft,
  onSwipeRight,
  index,
  totalCards,
}: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateZ = useSharedValue(0);
  const scale = useSharedValue(1);
  const { t } = useTranslation();

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const gestureHandler = Gesture.Pan()
    .onBegin(() => {
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotateZ.value = interpolate(
        event.translationX,
        [-screenWidth, 0, screenWidth],
        [-30, 0, 30],
      );
      const progress = Math.abs(event.translationX) / SWIPE_THRESHOLD;
      scale.value = interpolate(progress, [0, 1], [1, 0.95]);
    })
    .onEnd((event) => {
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;

      if (shouldSwipeRight) {
        translateX.value = withTiming(screenWidth * 1.5);
        rotateZ.value = withTiming(30);
        runOnJS(onSwipeRight)(profile);
        runOnJS(triggerHaptic)();
      } else if (shouldSwipeLeft) {
        translateX.value = withTiming(-screenWidth * 1.5);
        rotateZ.value = withTiming(-30);
        runOnJS(onSwipeLeft)(profile);
        runOnJS(triggerHaptic)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotateZ.value = withSpring(0);
        scale.value = withSpring(1);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [1, 0.8],
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotateZ.value}deg` },
        { scale: scale.value },
      ],
      opacity,
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  const cardScaleStyle = useAnimatedStyle(() => {
    const baseScale = 0.95 - index * 0.05;
    const yOffset = index * 10;
    return {
      transform: [{ scale: baseScale }, { translateY: yOffset }],
      zIndex: totalCards - index,
    };
  });

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev === profile.images.length - 1 ? 0 : prev + 1,
    );
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? profile.images.length - 1 : prev - 1,
    );
  };

  return (
    <View className="absolute self-center">
      <GestureDetector gesture={gestureHandler}>
        <AnimatedView
          style={[
            cardStyle,
            index > 0 && cardScaleStyle,
            {
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#fff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
        >
          {/* Photo */}
          <Image
            source={{ uri: profile.images[currentPhotoIndex] }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="disk"
          />

          {/* Top progress bars */}
          <View className="absolute top-5 left-4 right-4 flex-row gap-1">
            {profile.images.map((_, i) => (
              <View
                key={i}
                className="flex-1 h-[3px] rounded-sm"
                style={{
                  backgroundColor:
                    i === currentPhotoIndex ? "white" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </View>

          {/* Photo tap zones */}
          <Pressable
            className="absolute left-0 top-0 bottom-0 w-1/2"
            onPress={prevPhoto}
          />
          <Pressable
            className="absolute right-0 top-0 bottom-0 w-1/2"
            onPress={nextPhoto}
          />

          {/* Bottom vignette */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
            }}
          />

          {/* LIKE overlay */}
          <AnimatedView
            style={[
              likeOpacity,
              {
                position: "absolute",
                top: 50,
                right: 20,
                backgroundColor: "#4ECDC4",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 3,
                borderColor: "#fff",
                zIndex: 1,
              },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>
              {t("like")}
            </Text>
          </AnimatedView>

          {/* PASS overlay */}
          <AnimatedView
            style={[
              passOpacity,
              {
                position: "absolute",
                top: 50,
                left: 20,
                backgroundColor: "#FF6B6B",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 3,
                borderColor: "#fff",
                zIndex: 1,
              },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>
              {t("pass")}
            </Text>
          </AnimatedView>

          {/* Profile info gradient + content */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "40%",
              justifyContent: "flex-end",
            }}
          >
            <View className="p-5">
              <View className="flex-row items-baseline mb-1.5">
                <Text
                  style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}
                >
                  {profile.name}
                </Text>
                <Text
                  style={{ color: "#fff", fontSize: 28, fontWeight: "300" }}
                >
                  , {profile.age}
                </Text>
              </View>

              {profile.distance && (
                <View className="flex-row items-center mb-2">
                  <MapPin size={16} color="#fff" />
                  <Text
                    style={{
                      marginLeft: 4,
                      color: "#fff",
                      opacity: 0.9,
                      fontSize: 16,
                    }}
                  >
                    {profile.event.title}
                  </Text>
                </View>
              )}

              <View>
                <View className="flex-row flex-wrap gap-2">
                  <Tags tags={profile.hobbies} size="lg" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </AnimatedView>
      </GestureDetector>
    </View>
  );
}
