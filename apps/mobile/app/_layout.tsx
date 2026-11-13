import "@/global.css";
import "@/lib/i18n";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import useStoreSetup from "@/hooks/useStoreSetup";
import { captureError, initSentry } from "@/lib/sentry";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PortalHost } from "@rn-primitives/portal";
import { useFonts } from "expo-font";
import * as NavigationBar from "expo-navigation-bar";
import {
  ErrorBoundary as RouterErrorBoundary,
  type ErrorBoundaryProps,
  Stack,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
  useSafeAreaFrame,
} from "react-native-safe-area-context";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

initSentry();

// A screen that throws while rendering gets Expo Router's error screen, with
// its retry button, and the error is reported.
export function ErrorBoundary(props: ErrorBoundaryProps) {
  useEffect(() => {
    captureError(props.error);
  }, [props.error]);

  return <RouterErrorBoundary {...props} />;
}

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

SplashScreen.preventAutoHideAsync();

// In debug builds React Native turns the first warning of a run into this one
// bar, which covers the tab bar. Warnings stay in the console, and errors still
// show in LogBox.
LogBox.ignoreLogs(["Open debugger to view warnings"]);

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

const MainStack = () => {
  // Also keeps NativeWind's color scheme in sync with the theme setting.
  useAppTheme();
  const { isLoadingStore } = useStoreSetup();
  useLanguageSync();
  const frame = useSafeAreaFrame();

  useEffect(() => {
    if (!isLoadingStore) {
      SplashScreen.hideAsync();
    }
  }, [isLoadingStore]);

  // Android draws edge to edge: the system bars are transparent over the
  // SafeAreaView background, so only the button color is set here.
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle("light");
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      document.title = "Tulum";
    }
  }, []);

  return (
    <>
      <SafeAreaView className="flex-1 bg-light-color dark:bg-dark-color">
        <StatusBar barStyle="light-content" />
        {/* This SafeAreaView already keeps the app clear of the system bars.
            Insets are measured against the provider's own frame, so with a
            provider inside it the screens' SafeAreaViews and
            useSafeAreaInsets() get 0 and don't add the same space again. */}
        <SafeAreaProvider initialMetrics={{ frame, insets: NO_INSETS }}>
          <BottomSheetModalProvider>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="event-details/[id]"
                options={{ headerShown: false }}
              />
              {/* The page a poster's QR code opens; signed out too. */}
              <Stack.Screen name="e/[id]" options={{ headerShown: false }} />
              <Stack.Screen
                name="+not-found"
                options={{ headerShown: false }}
              />
            </Stack>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </SafeAreaView>
      {/* AlertDialog draws here on native; without a host it never appears.
          Outside the SafeAreaView so its backdrop also covers the system bars. */}
      <PortalHost />
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
          {/* Toaster's swipe-to-dismiss is a gesture too, so it must be inside. */}
          <GestureHandlerRootView style={{ flex: 1 }}>
            <MainStack />
            <Toaster />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
