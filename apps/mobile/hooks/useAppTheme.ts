import useStore from "@/store/useStore";
import { useColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme } from "nativewind";

const lightTheme = {
  background: "#f9fafb",
  backgroundStrong: "#f5f5f5",
  backgroundCard: "#ffffff",
  backgroundPopover: "#ffffff",
  backgroundFocus: "#6747f7",
  backgroundMuted: "#f5f5f5",
  backgroundAccent: "#ffffff",
  backgroundDestructive: "#e7000b",

  color: "#6747f7",
  colorStrong: "#0a0a0a",
  colorMuted: "#737373",
  colorInverse: "#fafafa",
  colorFocus: "#400ae2",

  color025: "rgba(103, 71, 247, 0.25)",
  color050: "rgba(103, 71, 247, 0.50)",
  color075: "rgba(103, 71, 247, 0.75)",
  background075: "rgba(249, 250, 251, 0.75)",

  primary: "#6747f7",
  primaryForeground: "#171717",

  secondary: "#171717",
  secondaryForeground: "#fafafa",

  accentColor: "#4f46e5",
  accentBackground: "#f4f4f6",
  accentForeground: "#f4f4f6",

  card: "#ffffff",
  cardForeground: "#0a0a0a",

  popover: "#ffffff",
  popoverForeground: "#0a0a0a",

  muted: "#f5f5f5",
  mutedForeground: "#737373",

  destructive: "#e7000b",
  destructiveForeground: "#e7000b",

  border: "#e5e5e5",
  input: "#e5e5e5",
  ring: "#a1a1a1",

  gray1: "#fafafa",
  gray2: "#f5f5f5",
  gray3: "#e5e5e5",
  gray4: "#d4d4d4",
  gray5: "#a1a1a1",
  gray6: "#737373",
  gray7: "#525252",
  gray8: "#525252",
  gray9: "#404040",
  gray10: "#737373",
  gray11: "#171717",
  gray12: "#0a0a0a",

  shadowColor: "rgba(0,0,0,0.03)",
  shadowStrong: "rgba(0,0,0,0.03)",

  red4: "#fecaca",
  red11: "#e7000b",
  blue10: "#3b82f6",

  brand: "#6747f7",
  brandForeground: "#fafafa",
  brandUltraviolet: "#400ae2",
  brandUltravioletForeground: "#4f46e5",

  chart1: "#7d72ff",
  chart2: "#7975c4",
  chart3: "#45416b",
  chart4: "#bbb2ff",
  chart5: "#9fa2ff",
};

const darkTheme: typeof lightTheme = {
  background: "#18181b",
  backgroundStrong: "#0a0a0a",
  backgroundCard: "#0a0a0a",
  backgroundPopover: "#0a0a0a",
  backgroundFocus: "#6747f7",
  backgroundMuted: "#262626",
  backgroundAccent: "#323236",
  backgroundDestructive: "#920004",

  color: "#6747f7",
  colorStrong: "#fafafa",
  colorMuted: "#a1a1a1",
  colorInverse: "#171717",
  colorFocus: "#a78bfa",

  color025: "rgba(103, 71, 247, 0.25)",
  color050: "rgba(103, 71, 247, 0.50)",
  color075: "rgba(103, 71, 247, 0.75)",
  background075: "rgba(24, 24, 27, 0.75)",

  primary: "#6747f7",
  primaryForeground: "#fafafa",

  secondary: "#fafafa",
  secondaryForeground: "#171717",

  accentColor: "#4f46e5",
  accentBackground: "#323236",
  accentForeground: "#f9fafb",

  card: "#0a0a0a",
  cardForeground: "#fafafa",

  popover: "#0a0a0a",
  popoverForeground: "#fafafa",

  muted: "#262626",
  mutedForeground: "#a1a1a1",

  destructive: "#920004",
  destructiveForeground: "#ff6356",

  border: "#262626",
  input: "#262626",
  ring: "#525252",

  gray1: "#0a0a0a",
  gray2: "#171717",
  gray3: "#262626",
  gray4: "#27272a",
  gray5: "#525252",
  gray6: "#737373",
  gray7: "#a1a1a1",
  gray8: "#a1a1a1",
  gray9: "#d4d4d4",
  gray10: "#a1a1a1",
  gray11: "#e5e5e5",
  gray12: "#fafafa",

  shadowColor: "rgba(0,0,0,0.3)",
  shadowStrong: "rgba(0,0,0,0.53)",

  red4: "#82181a",
  red11: "#ff6356",
  blue10: "#60a5fa",

  brand: "#6747f7",
  brandForeground: "#fafafa",
  brandUltraviolet: "#a78bfa",
  brandUltravioletForeground: "#4f46e5",

  chart1: "#5c30e0",
  chart2: "#9a90ff",
  chart3: "#9fa2ff",
  chart4: "#ad46ff",
  chart5: "#8a67ff",
};

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const theme = useStore((s) => s.settings.theme);

  const isDark =
    theme === "dark" || (theme === "system" && colorScheme === "dark");

  const newTheme = isDark ? "dark" : "light";
  nativewindColorScheme.set(newTheme);

  return isDark ? darkTheme : lightTheme;
}

export type AppTheme = typeof lightTheme;
