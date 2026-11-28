import { useAppTheme } from "@/hooks/use-app-theme";
import * as React from "react";
import { View } from "react-native";
import {
  Circle,
  Defs,
  G,
  Mask,
  Path,
  Rect,
  Svg,
  SvgProps,
} from "react-native-svg";

const LEFT_PIN_PATH =
  "M36.9492 341.045c64.899 146 261.499 240.9 325.699 268.7 2.8 1 5.7 1.4 8.5 1.4 2.9-.1 5.6-.7 8.1-1.8s4.8-2.7 6.7-4.8c1.9-2 3.5-4.5 4.7-7.3 22.5-66.2 84.1-275.6 19.3-421.7-27.6-62.1-73.6-112.9-128.1-141.3-54.4-28.4-112.8-32-162.2-10-49.5 21.9-86 67.6-101.5 127-15.5 59.4-8.7 127.7 18.8 189.8Z";
const RIGHT_PIN_PATH =
  "M706.349 341.045c-64.8 146-261.4 240.9-325.6 268.7-2.9 1-5.8 1.4-8.6 1.4-2.8-.1-5.5-.7-8-1.8-2.6-1.1-4.8-2.7-6.8-4.8-1.9-2-3.5-4.5-4.6-7.3-22.6-66.2-84.1-275.6-19.3-421.7 27.5-62.1 73.6-112.9 128-141.3 54.5-28.4 112.8-32 162.3-10 49.4 21.9 85.9 67.6 101.4 127 15.5 59.4 8.7 127.7-18.8 189.8Z";
const OUTLINE_STROKE_WIDTH = 62; // Equivalent to Lucide's 2/24 stroke ratio.
// The app icon's thinner outline.
const KNOCKOUT_STROKE_WIDTH = 20;
// Both dots as the app icon draws them: the outline's inner half covers
// their edge.
const KNOCKOUT_DOT_RADIUS = 74.1 - KNOCKOUT_STROKE_WIDTH / 2;

interface LogoProps extends SvgProps {
  color?: string;
  className?: string;
  /**
   * "knockout" is the app icon's mark in one colour, with see-through holes
   * instead of the theme's background, for use on a picture.
   */
  variant?: "default" | "outlined" | "filled" | "knockout";
}

const Logo = ({
  className,
  color,
  variant = "default",
  ...svgProps
}: LogoProps) => {
  const theme = useAppTheme();
  // Mask ids are page-wide on web, where a screen left behind stays mounted
  // and hidden: a second logo's url(#id) would find the hidden one's mask,
  // which browsers don't apply. useId's punctuation is dropped for url().
  const maskId = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const pinCutoutId = `left-pin-cutout-${maskId}`;
  const dotCutoutId = `right-dot-cutout-${maskId}`;
  const logoColor = color ?? theme.color;
  const isOutlined = variant === "outlined";
  const isFilled = variant === "filled";
  const isKnockout = variant === "knockout";
  const strokeWidth = isKnockout
    ? KNOCKOUT_STROKE_WIDTH
    : isOutlined || isFilled
      ? OUTLINE_STROKE_WIDTH
      : undefined;
  // The pins sit 10 units inside the 744×622 box and a stroke reaches half
  // its width past them, so the box grows by any excess: otherwise the
  // outline is cut off flat at the box's edges.
  const overflow = Math.max(0, (strokeWidth ?? 0) / 2 - 10);
  const box = {
    x: -overflow,
    y: -overflow,
    width: 744 + 2 * overflow,
    height: 622 + 2 * overflow,
  };

  return (
    <View className={className}>
      <Svg
        fill="none"
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        width={"100%"}
        height={"100%"}
        color={logoColor}
        {...svgProps}
      >
        <Defs>
          <Mask id={pinCutoutId} maskUnits="userSpaceOnUse" {...box}>
            <Rect {...box} fill="white" />
            <Path
              d={RIGHT_PIN_PATH}
              fill="black"
              stroke="black"
              strokeWidth={strokeWidth ?? 1}
            />
          </Mask>
          {isKnockout && (
            <Mask id={dotCutoutId} maskUnits="userSpaceOnUse" {...box}>
              <Rect {...box} fill="white" />
              <Circle
                cx={532.349}
                cy={233.745}
                r={KNOCKOUT_DOT_RADIUS}
                fill="black"
              />
            </Mask>
          )}
        </Defs>
        <G
          fill={isOutlined ? "none" : logoColor}
          stroke={logoColor}
          strokeWidth={strokeWidth}
          strokeLinecap={isOutlined ? "round" : undefined}
          strokeLinejoin={isOutlined ? "round" : undefined}
        >
          <G mask={`url(#${pinCutoutId})`}>
            <Path
              d={LEFT_PIN_PATH}
              fill={
                isOutlined || isKnockout
                  ? "none"
                  : isFilled
                    ? theme.background
                    : logoColor
              }
              stroke={
                isOutlined || isFilled || isKnockout
                  ? logoColor
                  : theme.background
              }
            />
            <Circle
              cx={200.349}
              cy={220.745}
              r={isKnockout ? KNOCKOUT_DOT_RADIUS : 74.1}
              fill={logoColor}
              stroke={isOutlined || isKnockout ? "none" : theme.background}
            />
          </G>
          <Path
            d={RIGHT_PIN_PATH}
            fill={isOutlined ? "none" : logoColor}
            mask={isKnockout ? `url(#${dotCutoutId})` : undefined}
          />
          {!isKnockout && (
            <Circle
              cx={532.349}
              cy={233.745}
              r={74.1}
              fill={isOutlined ? logoColor : theme.background}
              stroke={isOutlined ? "none" : logoColor}
            />
          )}
        </G>
      </Svg>
    </View>
  );
};
export default Logo;
