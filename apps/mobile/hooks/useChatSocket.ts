import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { Message } from "@/types/chat";

const TULUM_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

export function useChatSocket(
  chatId: number | null | undefined,
  userId: string | null | undefined,
  initialMessages: Message[] = [],
) {
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
      auth: { userId },
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
        id: number;
        chatId: number;
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
