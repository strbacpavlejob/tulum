import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@clerk/expo";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

type AuthGuardProps = PropsWithChildren<{
  title?: string;
  message?: string;
}>;

export function AuthGuard({
  children,
  title = "Login required",
  message = "Please log in to access and interact with this page.",
}: AuthGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [isModalMounted, setIsModalMounted] = useState(false);

  const blurProgress = useSharedValue(0);
  const modalProgress = useSharedValue(0);

  const showModal = () => {
    setIsModalMounted(true);

    blurProgress.value = 0;
    modalProgress.value = 0;

    blurProgress.value = withTiming(1, {
      duration: 450,
      easing: Easing.inOut(Easing.cubic),
    });

    modalProgress.value = withDelay(
      80,
      withSpring(1, {
        damping: 18,
        stiffness: 170,
        mass: 0.8,
      }),
    );
  };

  const hideModal = () => {
    modalProgress.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });

    blurProgress.value = withDelay(
      50,
      withTiming(
        0,
        {
          duration: 300,
          easing: Easing.inOut(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(setIsModalMounted)(false);
          }
        },
      ),
    );
  };

  useEffect(() => {
    if (isSignedIn && isModalMounted) {
      hideModal();
    }
  }, [isSignedIn, isModalMounted]);

  const blurAnimatedStyle = useAnimatedStyle(() => ({
    opacity: blurProgress.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(blurProgress.value, [0, 1], [0, 0.35]),
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalProgress.value,
    transform: [
      {
        translateY: interpolate(modalProgress.value, [0, 1], [32, 0]),
      },
      {
        scale: interpolate(modalProgress.value, [0, 1], [0.92, 1]),
      },
    ],
  }));

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {children}

      {!isSignedIn && (
        <View
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
          className="z-[9999] elevation-[9999]"
        >
          {!isModalMounted && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Login required"
              onPress={showModal}
              style={StyleSheet.absoluteFill}
              className="bg-transparent"
            />
          )}

          {isModalMounted && (
            <View pointerEvents="auto" style={StyleSheet.absoluteFill}>
              <AnimatedBlurView
                intensity={60}
                tint="dark"
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, blurAnimatedStyle]}
              />

              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}
                className="bg-black"
              />

              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  // Block interaction with the underlying screen.
                }}
              />

              <View
                pointerEvents="box-none"
                style={StyleSheet.absoluteFill}
                className="items-center justify-center p-6"
              >
                <Animated.View
                  style={modalAnimatedStyle}
                  className="w-full max-w-lg"
                >
                  <View className="rounded-3xl bg-light-background p-6 shadow-xl dark:bg-dark-background">
                    <Text className="text-center text-xl font-semibold text-light-colorStrong dark:text-dark-colorStrong">
                      {title}
                    </Text>

                    <Text className="mt-2 text-center text-light-colorStrong dark:text-dark-colorStrong">
                      {message}
                    </Text>

                    <Button
                      variant="filled"
                      className="mt-4 w-full"
                      onPress={() => router.push("/sign-in")}
                    >
                      <Text>Log In</Text>
                    </Button>
                  </View>
                </Animated.View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
