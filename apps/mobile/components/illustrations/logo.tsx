import { useAppTheme } from "@/hooks/useAppTheme";
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

interface LogoProps extends SvgProps {
  color?: string;
  className?: string;
  variant?: "default" | "outlined" | "filled";
}

const Logo = ({
  className,
  color,
  variant = "default",
  ...svgProps
}: LogoProps) => {
  const theme = useAppTheme();
  const logoColor = color ?? theme.color;
  const isOutlined = variant === "outlined";
  const isFilled = variant === "filled";
  const strokeWidth =
    isOutlined || isFilled ? OUTLINE_STROKE_WIDTH : undefined;

  return (
    <View className={className}>
      <Svg
        fill="none"
        viewBox="0 0 744 622"
        width={"100%"}
        height={"100%"}
        color={logoColor}
        {...svgProps}
      >
        <Defs>
          <Mask
            id="left-pin-cutout"
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={744}
            height={622}
          >
            <Rect width={744} height={622} fill="white" />
            <Path
              d={RIGHT_PIN_PATH}
              fill="black"
              stroke="black"
              strokeWidth={strokeWidth ?? 1}
            />
          </Mask>
        </Defs>
        <G
          fill={isOutlined ? "none" : logoColor}
          stroke={logoColor}
          strokeWidth={strokeWidth}
          strokeLinecap={isOutlined ? "round" : undefined}
          strokeLinejoin={isOutlined ? "round" : undefined}
        >
          <G mask="url(#left-pin-cutout)">
            <Path
              d={LEFT_PIN_PATH}
              fill={
                isOutlined ? "none" : isFilled ? theme.background : logoColor
              }
              stroke={isOutlined || isFilled ? logoColor : theme.background}
            />
            <Circle
              cx={200.349}
              cy={220.745}
              r={74.1}
              fill={logoColor}
              stroke={isOutlined ? "none" : theme.background}
            />
          </G>
          <Path d={RIGHT_PIN_PATH} fill={isOutlined ? "none" : logoColor} />
          <Circle
            cx={532.349}
            cy={233.745}
            r={74.1}
            fill={isOutlined ? logoColor : theme.background}
            stroke={isOutlined ? "none" : logoColor}
          />
        </G>
      </Svg>
    </View>
  );
};
export default Logo;
