"use client";

import { Android } from "./ui/android";
import { Iphone } from "./ui/iphone";
import { useAppleDevice } from "@/hooks/use-apple-device";

export interface PhoneProps {
  src?: string;
  videoSrc?: string;
  component?: React.ReactNode;
  className?: string;
}

function Phone({ src, videoSrc, component, className }: PhoneProps) {
  const isApple = useAppleDevice();

  return (
    <div
      className={`pointer-events-none select-none relative ${className ?? ""}`}
      style={{
        aspectRatio: "433/882",
      }}
    >
      {isApple ? (
        <Iphone src={src} videoSrc={videoSrc} component={component} />
      ) : (
        <Android src={src} videoSrc={videoSrc} component={component} />
      )}
    </div>
  );
}

export default Phone;
