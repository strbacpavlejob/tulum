"use client";

import { SendHorizonal, UserSearch } from "lucide-react";
import { faker } from "@faker-js/faker";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

export function ChatScreen() {
  const { t } = useTranslation();
  const chatLines = t("landingpage.screens.chat.lines", {
    returnObjects: true,
  }) as string[];
  const avatar = `https://mockmind-api.uifaces.co/content/human/207.jpg`;

  // generate 4–6 messages
  const messageCount = faker.number.int({ min: 4, max: 6 });

  const messages = Array.from({ length: messageCount }).map((_, i) => {
    const isAna = i % 2 === 0; // alternate
    return {
      id: i,
      text: faker.helpers.arrayElement(chatLines),
      isAna,
    };
  });

  return (
    <div className="h-full w-full bg-background/80 flex flex-col font-sans text-foreground overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 pt-14 border-b border-white/10">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatar} alt="Ana avatar" className="object-cover" />
        </Avatar>
        <div>
          <p className="text-lg font-semibold">Ana</p>
          <p className="text-sm text-foreground/60">
            {t("landingpage.screens.chat.at")}{" "}
            {faker.helpers.arrayElement([
              "Ben Akiba",
              "Freestyler",
              "Sipaj ne pitaj",
              "Zappa bar",
            ])}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-foreground/60 p-4">
          <UserSearch className="ml-auto h-8 w-8 text-foreground/60" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 flex flex-col gap-2.5 justify-end">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[75%] rounded-2xl px-3 py-2 text-lg ${
              msg.isAna
                ? "self-start rounded-bl-sm bg-foreground/10 text-foreground/60"
                : "self-end rounded-br-sm bg-primary text-background/80"
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
