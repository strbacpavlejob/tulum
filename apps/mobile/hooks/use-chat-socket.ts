import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { Message } from "@/types/chat";

const TULUM_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

export function useChatSocket(
  chatId: string | null | undefined,
  userId: string | null | undefined,
  initialMessages: Message[] = [],
) {
  const { getToken } = useAuth();
  // useAuth returns a new getToken on every render; reading it through a ref
  // keeps the socket from reconnecting each time.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Reset messages whenever the chat changes
  useEffect(() => {
    setMessages(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !userId) return;

    const socket = io(TULUM_API_URL, {
      // The API verifies this Clerk session token in the handshake and takes
      // the user from it. socket.io calls this on every connection attempt,
      // so a reconnect sends a current token, not the first one.
      auth: (cb) => {
        getTokenRef.current().then(
          (token) => cb({ token }),
          () => cb({}),
        );
      },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_chat", { chatId });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on(
      "new_message",
      (msg: {
        id: string;
        chatId: string;
        senderId: string;
        text: string;
        sentAt: string;
      }) => {
        if (msg.chatId !== chatId) return;
        setMessages((prev) => [
          ...prev,
          {
            id: String(msg.id),
            text: msg.text,
            timestamp: new Date(msg.sentAt),
            isFromUser: msg.senderId === userId,
          },
        ]);
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chatId, userId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!socketRef.current?.connected || !chatId) return;
      socketRef.current.emit("send_message", { chatId, text });
    },
    [chatId],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current?.connected || !chatId) return;
      socketRef.current.emit("typing", { chatId, isTyping });
    },
    [chatId],
  );

  return { messages, connected, sendMessage, sendTyping };
}
