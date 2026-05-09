import { useEffect } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

// Warm up the browser for faster OAuth experience on Android
// Only runs on native platforms (iOS/Android), not on web
export const useWarmUpBrowser = () => {
  useEffect(() => {
    // Skip on web - warmUpAsync is not available
    if (Platform.OS === "web") return;

    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};
