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

export const TagsMarquee = ({
  children,
  active,
  speed = 40,
}: {
  children: React.ReactNode;
  active: boolean;
  speed?: number;
}) => {
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
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={(width) => setContentWidth(width)}
        style={{ width: "100%" }}
        contentContainerStyle={{ flexGrow: 0 }}
      >
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      </ScrollView>
    </View>
  );
};
