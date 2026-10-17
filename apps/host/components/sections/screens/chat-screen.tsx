"use client";

import { SendHorizonal, UserSearch } from "lucide-react";
import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

type ChatMessage = {
  sender: "ana" | "me";
  text: string;
};

export function ChatScreen() {
  const { t } = useTranslation();
  const messages = t("landingpage.screens.chat.messages", {
    returnObjects: true,
  }) as ChatMessage[];
  const avatar = "https://mockmind-api.uifaces.co/content/human/207.jpg";

  return (
    <div className="h-full w-full bg-background/80 flex flex-col font-sans text-foreground overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 pt-4 border-b border-white/10">
        <Avatar className="h-16 w-16">
          <Image
            src={avatar}
            alt={t("landingpage.screens.chat.avatarAlt")}
            width={128}
            height={128}
            sizes="64px"
            quality={60}
            className="h-full w-full object-cover"
          />
        </Avatar>
        <div>
          <p className="text-lg font-semibold">
            {t("landingpage.screens.chat.name")}
          </p>
          <p className="text-sm text-foreground/60">
            {t("landingpage.screens.chat.eventLocation")}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-foreground/60 p-4">
          <UserSearch className="ml-auto h-8 w-8 text-foreground/60" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 flex flex-col gap-2.5 justify-end">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[75%] rounded-2xl px-3 py-2 text-lg ${
              msg.sender === "ana"
                ? "self-start rounded-bl-sm bg-foreground/10 text-foreground/60"
                : "self-end rounded-br-sm bg-primary text-white"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/10">
        <div className="rounded-full bg-foreground/10 px-4 py-2.5 flex items-center justify-between">
          <span className="text-lg text-foreground/60">
            {t("landingpage.screens.chat.messagePlaceholder")}
          </span>
          <SendHorizonal className="h-5 w-5 text-foreground/60" />
        </div>
      </div>
    </div>
  );
}
