import type { TextStyle } from "react-native";

/** Fredoka's weights, as the sign-in screen loads them with useFonts. */
export const FREDOKA = {
  medium: "Fredoka_500Medium",
  semiBold: "Fredoka_600SemiBold",
  bold: "Fredoka_700Bold",
} as const;

export type FredokaWeight = keyof typeof FREDOKA;

const WEIGHTS: Record<FredokaWeight, TextStyle["fontWeight"]> = {
  medium: "500",
  semiBold: "600",
  bold: "700",
};

/**
 * Fredoka at a weight, for text in the app's language. Fredoka has no
 * Cyrillic letters, so Russian gets the system font at the same weight:
 * left to fall back letter by letter, Russian came out in the regular
 * weight (in a browser's serif font on the web), between Fredoka's Latin
 * words and punctuation.
 */
export function fredoka(weight: FredokaWeight, language: string): TextStyle {
  return language === "RU"
    ? { fontWeight: WEIGHTS[weight] }
    : { fontFamily: FREDOKA[weight] };
}
