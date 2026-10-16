"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import {
  EyeIcon,
  Heart,
  Map,
  MessageCircle,
  UserSearch,
  Users,
} from "lucide-react";
import Phone from "../phone";
import { ChatScreen } from "./screens/chat-screen";
import { DiscoverScreen } from "./screens/discover-screen";
import { FindScreen } from "./screens/find-screen";
import { GuestListScreen } from "./screens/guest-list-screen";
import { MatchScreen } from "./screens/match-screen";
import { VibeScreen } from "./screens/vibe-screen";
import { MascotSlot } from "./mascot-slot";

export default function FeatureHighlight() {
  const { t } = useTranslation();

  const features = [
    {
      id: "discover",
      icon: <Map className="size-7 sm:size-8" />,
      title: t("landingpage.featureHighlight.features.discover.title"),
      description: t(
        "landingpage.featureHighlight.features.discover.description",
      ),
      screen: <DiscoverScreen />,
      mascot: "/images/mascots/map-image.png",
    },
    {
      id: "vibe",
      icon: <EyeIcon className="size-7 sm:size-8" />,
      title: t("landingpage.featureHighlight.features.vibe.title"),
      description: t("landingpage.featureHighlight.features.vibe.description"),
      screen: <VibeScreen />,
      mascot: "/images/mascots/details-image.png",
    },
    {
      id: "guest-list",
      icon: <Users className="size-7 sm:size-8" />,
      title: t("landingpage.featureHighlight.features.guestList.title"),
      description: t(
        "landingpage.featureHighlight.features.guestList.description",
      ),
      screen: <GuestListScreen />,
      mascot: "/images/mascots/ticket-image.png",
    },
    {
      id: "match",
      icon: <Heart className="size-7 sm:size-8" />,
      title: t("landingpage.featureHighlight.features.match.title"),
      description: t("landingpage.featureHighlight.features.match.description"),
      screen: <MatchScreen />,
      mascot: "/images/mascots/match-image.png",
    },
    {
      id: "chat",
      icon: <MessageCircle className="size-7 sm:size-8" />,
      title: t("landingpage.featureHighlight.features.chat.title"),
      description: t("landingpage.featureHighlight.features.chat.description"),
      screen: <ChatScreen />,
      mascot: "/images/mascots/chat-image.png",
    },
    {
      id: "find",
      icon: <UserSearch className="size-7 sm:size-8" />,
      title: t("landingpage.featureHighlight.features.find.title"),
      description: t("landingpage.featureHighlight.features.find.description"),
      screen: <FindScreen />,
      mascot: "/images/mascots/search-image.png",
    },
  ];

  return (
    <section
      id="features"
      className="scroll-mt-28 w-full px-5 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div
          id="how-it-works"
          className="scroll-mt-28 mx-auto mb-8 max-w-2xl text-center sm:mb-12"
        >
          <h2 className="mb-3 text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
            {t("landingpage.featureHighlight.title")}
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            {t("landingpage.featureHighlight.subtitle")}
          </p>
        </div>

        <div className="space-y-5 sm:space-y-7">
          {features.map((feature, index) => {
            const reversed = index % 2 === 1;

            return (
              <article
                key={feature.id}
                className="landing-feature-card relative grid items-center gap-5 overflow-hidden rounded-3xl border border-border bg-card/60 p-5 shadow-sm sm:gap-8 sm:p-8 md:grid-cols-2 md:gap-10 md:p-10"
              >
                <div className={reversed ? "md:order-2" : ""}>
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:gap-5">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary sm:size-16">
                      {feature.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {feature.title}
                      </h3>
                      <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`relative flex min-h-[430px] items-center justify-center sm:min-h-[490px] ${
                    reversed ? "md:order-1" : ""
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl sm:size-64"
                  />
                  <div
                    className={`relative z-10 w-[210px] sm:w-[238px] lg:w-[260px] ${
                      reversed
                        ? "how-it-works-mascot-anchor-left"
                        : "how-it-works-mascot-anchor-right"
                    }`}
                  >
                    <Phone
                      component={feature.screen}
                      scaleComponentContent
                      className="w-full drop-shadow-2xl"
                    />
                    <MascotSlot
                      name={`how-it-works-${feature.id}`}
                      className={`how-it-works-mascot ${
                        reversed
                          ? "how-it-works-mascot-left"
                          : "how-it-works-mascot-right"
                      }`}
                    >
                      <Image
                        src={feature.mascot}
                        alt=""
                        width={1374}
                        height={1145}
                        sizes="(max-width: 400px) 104px, (max-width: 600px) 26vw, (max-width: 639px) 156px, (max-width: 1023px) 187px, 208px"
                        className="drop-shadow-xl"
                      />
                    </MascotSlot>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
