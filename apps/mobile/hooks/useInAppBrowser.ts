import { detectInAppBrowser, type InAppBrowser } from "@/lib/in-app-browser";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

let cached: { userAgent: string; browser: InAppBrowser | null } | null = null;

function inAppBrowserSnapshot(): InAppBrowser | null {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return null;
  const { userAgent } = navigator;
  // useSyncExternalStore needs the same object back while nothing changed.
  if (cached?.userAgent !== userAgent) {
    cached = { userAgent, browser: detectInAppBrowser(userAgent) };
  }
  return cached.browser;
}

const noSubscription = () => () => {};

/**
 * The in-app browser (Instagram's, Facebook's…) the web app runs in, or
 * null. Null while the static HTML hydrates, so the server's render and the
 * first client render match.
 */
export function useInAppBrowser(): InAppBrowser | null {
  return useSyncExternalStore(noSubscription, inAppBrowserSnapshot, () => null);
}
