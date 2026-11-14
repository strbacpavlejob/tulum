import { detectInAppBrowser } from "@/lib/in-app-browser";
import { Platform } from "react-native";

/**
 * Where the app runs, kept with a guest's sign-up and consent answers:
 * "ios" or "android" for the native apps. On the web, "web-" and the phone's
 * system (ios, android or desktop), then the app whose browser it is, if
 * any: web-ios, web-android-instagram.
 */
export function appPlatform(): string {
  if (Platform.OS !== "web") return Platform.OS;
  if (typeof navigator === "undefined") return "web";
  const { userAgent } = navigator;
  const system = /Android/i.test(userAgent)
    ? "android"
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? "ios"
      : "desktop";
  const inApp = detectInAppBrowser(userAgent);
  return inApp ? `web-${system}-${inApp.app.toLowerCase()}` : `web-${system}`;
}
