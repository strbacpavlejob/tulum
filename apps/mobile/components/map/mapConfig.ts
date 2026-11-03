import { LATITUDE_DELTA, LONGITUDE_DELTA } from "@/constants/map";
import { AppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import { useColorScheme } from "react-native";

// Shared by the native Leaflet maps. The web maps (*.web.tsx) keep their own
// copies of these values.

const maptilerKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? "";

export const TILE_URLS = {
  dark: `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${maptilerKey}`,
  light: `https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${maptilerKey}`,
};

export const INITIAL_REGION = {
  longitude: 20.4573,
  latitude: 44.8156,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

export const INITIAL_ZOOM = 13;
export const ACTIVE_PIN_ZOOM = 16;
export const ACTIVE_PIN_FLY_SECONDS = 0.35;
export const VENUE_ZOOM = 14;
export const FIT_BOUNDS_PADDING = 60;

export function isValidCoord(lat: unknown, lng: unknown) {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

type StoreState = ReturnType<typeof useStore.getState>;

/** Dark tiles follow the app theme, or the device when it is set to system. */
export function useIsDarkMap() {
  const colorScheme = useColorScheme();
  const storeTheme = useStore((s: StoreState) => s.settings.theme);
  return (
    storeTheme === "dark" || (storeTheme === "system" && colorScheme === "dark")
  );
}

/** The theme colors MapMarkerIcon and MapClusterIcon draw with. */
export type MapPalette = Pick<
  AppTheme,
  | "background"
  | "color"
  | "color050"
  | "color075"
  | "colorStrong"
  | "gray3"
  | "gray10"
>;

export function mapPalette(theme: AppTheme): MapPalette {
  return {
    background: theme.background,
    color: theme.color,
    color050: theme.color050,
    color075: theme.color075,
    colorStrong: theme.colorStrong,
    gray3: theme.gray3,
    gray10: theme.gray10,
  };
}
