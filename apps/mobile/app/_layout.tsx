import "@/global.css";
import "@/lib/i18n";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import useStoreSetup from "@/hooks/useStoreSetup";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

SplashScreen.preventAutoHideAsync();

const MainStack = () => {
  const theme = useAppTheme();
  const background = theme.color;
  const { isLoadingStore } = useStoreSetup();
  useLanguageSync();

  useEffect(() => {
    if (!isLoadingStore) {
      SplashScreen.hideAsync();
    }
  }, [isLoadingStore]);

  useEffect(() => {
    StatusBar.setBackgroundColor(background, true);
    NavigationBar.setBackgroundColorAsync(background).catch(console.warn);
    NavigationBar.setButtonStyleAsync("light");
  }, [background]);

  useEffect(() => {
    if (Platform.OS === "web") {
      document.title = "Tulum";
    }
  }, []);

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="event-details"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="event-details/[id]"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="+not-found"
                options={{ headerShown: false }}
              />
            </Stack>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </SafeAreaView>
    </>
  );
};

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    SplashScreen.hide();
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <MainStack />
        </SafeAreaProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
