"use client";

import { Android } from "./ui/android";
import { Iphone } from "./ui/iphone";
import { useAppleDevice } from "@/hooks/use-apple-device";

export interface PhoneProps {
  src?: string;
  videoSrc?: string;
  component?: React.ReactNode;
  scaleComponentContent?: boolean;
  className?: string;
}

function Phone({
  src,
  videoSrc,
  component,
  scaleComponentContent = false,
  className,
}: PhoneProps) {
  const isApple = useAppleDevice();

  return (
    <div
      className={`pointer-events-none select-none relative ${className ?? ""}`}
      style={{
        aspectRatio: "433/882",
      }}
    >
      {isApple ? (
        <Iphone
          src={src}
          videoSrc={videoSrc}
          component={component}
          scaleComponentContent={scaleComponentContent}
        />
      ) : (
        <Android
          src={src}
          videoSrc={videoSrc}
          component={component}
          scaleComponentContent={scaleComponentContent}
        />
      )}
    </div>
  );
}

export default Phone;
