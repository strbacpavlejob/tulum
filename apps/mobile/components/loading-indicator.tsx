import React from "react";
import { View } from "react-native";
import LottieView, { type AnimationObject } from "lottie-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import loadingAnimation from "../animations/loading.json";

type LayerShape = {
  ty?: string;
  c?: {
    a?: number;
    k?: number[];
  };
};

type Layer = {
  nm?: string;
  shapes?: LayerShape[];
};

const hexToLottieRgb = (hex: string): [number, number, number] | null => {
  const sanitized = hex.replace("#", "").trim();
  const fullHex =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : sanitized;

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return null;
  }

  const value = Number.parseInt(fullHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return [r / 255, g / 255, b / 255];
};

const recolorLayer = (layer: Layer, hex: string) => {
  const rgb = hexToLottieRgb(hex);

  if (!rgb || !layer.shapes) {
    return;
  }

  for (const shape of layer.shapes) {
    // Lottie solid fill/stroke colors are stored as normalized RGB arrays.
    if (
      (shape.ty === "fl" || shape.ty === "st") &&
      shape.c?.a === 0 &&
      Array.isArray(shape.c.k)
    ) {
      shape.c.k = rgb;
    }
  }
};

const LoadingIndicator = () => {
  const theme = useAppTheme();
  const primaryColor = theme.primary;
  const secondaryColor = theme.border;
  const themedAnimation = React.useMemo(() => {
    const animation = JSON.parse(
      JSON.stringify(loadingAnimation),
    ) as AnimationObject;

    for (const layer of (animation.layers as Layer[] | undefined) ?? []) {
      if (layer.nm === "left circle" || layer.nm === "right pin") {
        recolorLayer(layer, primaryColor);
      }

      if (layer.nm === "right circle" || layer.nm === "left pin") {
        recolorLayer(layer, secondaryColor);
      }
    }

    return animation;
  }, [primaryColor, secondaryColor]);

  return (
    <View className="flex-1 justify-center items-center">
      <View className="w-32 h-32">
        <LottieView source={themedAnimation} autoPlay loop />
      </View>
    </View>
  );
};

export default LoadingIndicator;
