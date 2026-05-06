"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

import {
  EyeIcon,
  Map,
  Users,
  MessageCircle,
  Heart,
  UserSearch,
} from "lucide-react";
import { DiscoverScreen } from "./screens/discover-screen";
import { VibeScreen } from "./screens/vibe-screen";
import { GuestListScreen } from "./screens/guest-list-screen";
import { MatchScreen } from "./screens/match-screen";
import { ChatScreen } from "./screens/chat-screen";
import { FindScreen } from "./screens/find-screen";
import Phone from "../phone";

export default function FeatureHighlight() {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Map className="h-12 w-12 text-secondary" />,
      title: t("landingpage.featureHighlight.features.discover.title"),
      description: t(
        "landingpage.featureHighlight.features.discover.description",
      ),
      screen: <DiscoverScreen />,
    },
    {
      icon: <EyeIcon className="h-12 w-12 text-secondary" />,
      title: t("landingpage.featureHighlight.features.vibe.title"),
      description: t("landingpage.featureHighlight.features.vibe.description"),
      screen: <VibeScreen />,
    },
    {
      icon: <Users className="h-12 w-12 text-secondary" />,
      title: t("landingpage.featureHighlight.features.guestList.title"),
      description: t(
        "landingpage.featureHighlight.features.guestList.description",
      ),
      screen: <GuestListScreen />,
    },
    {
      icon: <Heart className="h-12 w-12 text-secondary" />,
      title: t("landingpage.featureHighlight.features.match.title"),
      description: t("landingpage.featureHighlight.features.match.description"),
      screen: <MatchScreen />,
    },
    {
      icon: <MessageCircle className="h-12 w-12 text-secondary" />,
      title: t("landingpage.featureHighlight.features.chat.title"),
      description: t("landingpage.featureHighlight.features.chat.description"),
      screen: <ChatScreen />,
    },
    {
      icon: <UserSearch className="h-12 w-12 text-secondary" />,
      title: t("landingpage.featureHighlight.features.find.title"),
      description: t("landingpage.featureHighlight.features.find.description"),
      screen: <FindScreen />,
    },
  ];

  return (
    <section
      id="feature-highlight"
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 w-full"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t("landingpage.featureHighlight.title")}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("landingpage.featureHighlight.subtitle")}
          </p>
        </div>

        {/* Feature rows */}
        <div className="flex flex-col justify-center gap-16 sm:gap-20 lg:gap-28 px-4 sm:px-32">
          {features.map((feature, idx) => {
            const isReversed = idx % 2 === 1;
            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-between gap-8 sm:gap-10 lg:gap-16 ${
                  isReversed ? "lg:flex-row-reverse" : "lg:flex-row"
                }`}
              >
                {/* Text */}
                <div className="w-full lg:w-1/2">
                  <div
                    className={`flex flex-col items-center text-center ${
                      isReversed
                        ? "lg:items-end lg:text-right"
                        : "lg:items-start lg:text-left"
                    }`}
                  >
                    <div
                      className={cn(
                        "mb-4 sm:mb-6 inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl",
                        "group relative overflow-hidden",
                        // light styles
                        "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
                        // dark styles
                        "dark:bg-background transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
                      )}
                    >
                      <div className="flex items-center justify-center">
                        {feature.icon}
                      </div>
                    </div>
                    <h3 className="mb-2 sm:mb-4 text-xl sm:text-2xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="w-full lg:w-1/2 flex justify-center">
                  <Phone
                    component={feature.screen}
                    className="w-50 sm:w-58 md:w-65 lg:w-70 h-auto drop-shadow-2xl"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
