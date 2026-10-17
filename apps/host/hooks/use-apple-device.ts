import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

const getSnapshot = () =>
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod|Macintosh|Mac OS/i.test(navigator.userAgent);

const getServerSnapshot = () => false;

export const useAppleDevice = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
