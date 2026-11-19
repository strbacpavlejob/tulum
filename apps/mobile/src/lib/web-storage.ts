import { Platform } from "react-native";

/**
 * The browser's local storage, or null on native, where nothing outlives
 * the app's memory here.
 */
export function webStorage(): Storage | null {
  if (Platform.OS !== "web") return null;
  try {
    return window.localStorage;
  } catch {
    // Static rendering has no window, and some private modes refuse storage.
    return null;
  }
}
