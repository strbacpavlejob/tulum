import { useState } from "react";

export function useAppleDevice() {
  const [isApple] = useState(() => {
    if (typeof navigator === "undefined") return false;
    return /iPhone|iPad|iPod|Macintosh|Mac OS/i.test(navigator.userAgent);
  });

  return isApple;
}
