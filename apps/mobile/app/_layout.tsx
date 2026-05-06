import "@/global.css";
import { useAppTheme } from "@/hooks/useAppTheme";
import useStoreSetup from "@/hooks/useStoreSetup";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

SplashScreen.preventAutoHideAsync();

const MainStack = () => {
  const theme = useAppTheme();
  const background = theme.color;

  useEffect(() => {
    StatusBar.setBackgroundColor(background, true);
    NavigationBar.setBackgroundColorAsync(background).catch(console.warn);
    NavigationBar.setButtonStyleAsync("light");
  }, [background]);

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
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="event-details"
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
  const { isLoadingStore } = useStoreSetup();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded && !isLoadingStore) {
    SplashScreen.hide();
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <MainStack />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
