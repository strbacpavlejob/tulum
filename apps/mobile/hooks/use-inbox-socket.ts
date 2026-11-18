import { useAuth } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const TULUM_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
/** The wait before connecting again after the API refused or ended the
 * socket, plus up to RETRY_JITTER_MS so phones don't all come back at once. */
const RETRY_MS = 30_000;
const RETRY_JITTER_MS = 10_000;

/**
 * A socket that stays open while the user is signed in. The API sends
 * inbox_changed on it when the user gets a new match or message, and
 * onChange runs then. Returns whether the socket is connected: pushes sent
 * while it is down are lost, so the caller reads the inbox when it
 * reconnects and polls while it is down.
 */
export function useInboxSocket(
  userId: string | null | undefined,
  onChange: () => void,
): boolean {
  const { getToken } = useAuth();
  // useAuth returns a new getToken on every render; reading it and onChange
  // through refs keeps the socket from reconnecting each time.
  const getTokenRef = useRef(getToken);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    getTokenRef.current = getToken;
    onChangeRef.current = onChange;
  }, [getToken, onChange]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const socket = io(TULUM_API_URL, {
      // The API verifies this Clerk session token in the handshake and puts
      // the socket in the user's room. socket.io calls this on every
      // connection attempt, so a reconnect sends a current token.
      auth: (cb) => {
        getTokenRef.current().then(
          (token) => cb({ token }),
          () => cb({}),
        );
      },
      transports: ["websocket"],
    });

    // socket.io reconnects by itself after a dropped connection, but not
    // after the API refused the handshake or ended the socket itself; then
    // it is tried again here, later, with a new token.
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connectLater = () => {
      clearTimeout(retry);
      retry = setTimeout(
        () => socket.connect(),
        RETRY_MS + Math.random() * RETRY_JITTER_MS,
      );
    };

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", (reason) => {
      setConnected(false);
      if (reason === "io server disconnect") connectLater();
    });
    socket.on("connect_error", () => {
      if (!socket.active) connectLater();
    });
    socket.on("inbox_changed", () => onChangeRef.current());

    return () => {
      clearTimeout(retry);
      socket.disconnect();
      setConnected(false);
    };
  }, [userId]);

  return connected;
}
