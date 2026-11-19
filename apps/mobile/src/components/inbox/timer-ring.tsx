import { STROKE_WIDTH, TOTAL_WINDOW_MS, ringColor } from "./inbox-model";
import Svg, { Circle } from "react-native-svg";

export function TimerRing({
  expiresAt,
  size,
}: {
  expiresAt: Date;
  size: number;
}) {
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const timeLeft = Math.max(0, expiresAt.getTime() - Date.now());
  const progress = Math.min(1, timeLeft / TOTAL_WINDOW_MS);
  const strokeDashoffset = circumference * (1 - progress);
  const stroke = ringColor(expiresAt);

  return (
    <Svg
      width={size}
      height={size}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(0,0,0,0.1)"
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
