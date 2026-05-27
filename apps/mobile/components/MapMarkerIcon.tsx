import { useAppTheme } from "@/hooks/useAppTheme";
import { MapPin } from "lucide-react-native";
import React, { useEffect } from "react";
import { Image } from "expo-image";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface MapMarkerProps {
  image?: string;
  size?: "sm" | "md" | "xl";
  isSelected?: boolean;
}

const sizeConfig = {
  sm: { outer: 32, inner: 24, border: 2, icon: 12 },
  md: { outer: 48, inner: 40, border: 2, icon: 20 },
  xl: { outer: 64, inner: 52, border: 3, icon: 28 },
};

const MapMarkerIcon = ({
  image,
  size = "md",
  isSelected = false,
}: MapMarkerProps) => {
  const theme = useAppTheme();
  const config = sizeConfig[size];

  // Pulse ring 1
  const pulse1Scale = useSharedValue(1);
  const pulse1Opacity = useSharedValue(0.5);

  // Pulse ring 2 (delayed)
  const pulse2Scale = useSharedValue(1);
  const pulse2Opacity = useSharedValue(0.3);

  useEffect(() => {
    const duration = 2000;
    const easing = Easing.inOut(Easing.ease);

    pulse1Scale.value = withRepeat(
      withTiming(1.5, { duration, easing }),
      -1,
      true,
    );
    pulse1Opacity.value = withRepeat(
      withTiming(0, { duration, easing }),
      -1,
      true,
    );

    pulse2Scale.value = withDelay(
      500,
      withRepeat(withTiming(1.5, { duration, easing }), -1, true),
    );
    pulse2Opacity.value = withDelay(
      500,
      withRepeat(withTiming(0, { duration, easing }), -1, true),
    );
  }, []);

  const pulseStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1Scale.value }],
    opacity: pulse1Opacity.value,
  }));

  const pulseStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2Scale.value }],
    opacity: pulse2Opacity.value,
  }));

  return (
    <View
      style={{
        width: config.outer + 16,
        height: config.outer + 16,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Pulse ring 1 */}
      <Animated.View
        style={[
          pulseStyle1,
          {
            position: "absolute",
            width: config.outer,
            height: config.outer,
            borderRadius: config.outer / 2,
            backgroundColor: theme.color,
          },
        ]}
      />
      {/* Pulse ring 2 */}
      <Animated.View
        style={[
          pulseStyle2,
          {
            position: "absolute",
            width: config.outer,
            height: config.outer,
            borderRadius: config.outer / 2,
            backgroundColor: theme.color,
          },
        ]}
      />

      {/* Inner circle */}
      {image ? (
        <View
          style={{
            width: config.inner,
            height: config.inner,
            borderRadius: config.inner / 2,
            borderWidth: config.border,
            borderColor: isSelected ? theme.color : theme.color075,
            overflow: "hidden",
            backgroundColor: theme.background,
          }}
        >
          <Image
            source={{ uri: image }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            cachePolicy="disk"
          />
        </View>
      ) : (
        <View
          style={{
            width: config.inner,
            height: config.inner,
            borderRadius: config.inner / 2,
            backgroundColor: theme.gray3,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MapPin size={config.icon} color={theme.gray10} />
        </View>
      )}
    </View>
  );
};

export default MapMarkerIcon;
