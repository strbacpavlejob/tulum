import { useEffect, useState } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { View } from "react-native";

interface MarqueeProps {
  children: React.ReactNode;
  active: boolean;
  speed?: number;
}

export const Marquee = ({ children, active, speed = 40 }: MarqueeProps) => {
  const translateX = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const shouldScroll =
    active && containerWidth > 0 && contentWidth > containerWidth;

  useEffect(() => {
    cancelAnimation(translateX);
    translateX.value = 0;

    if (!shouldScroll) return;

    const distance = contentWidth - containerWidth + 32;
    const duration = distance * speed;

    translateX.value = withRepeat(
      withTiming(-distance, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      true,
    );
  }, [shouldScroll, contentWidth, containerWidth, speed]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={{ width: "100%", overflow: "hidden" }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignSelf: "flex-start",
            flexShrink: 0,
          },
          animatedStyle,
        ]}
        onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
      >
        {children}
      </Animated.View>
    </View>
  );
};
