"use client";

import { useTranslation } from "react-i18next";

import {
  StatisticCard,
  StatisticCardProps,
} from "@/components/common/statistic-card";
import "../i18n";

interface SectionCardsProps {
  statistics?: StatisticCardProps[];
}

export function SectionCards({ statistics }: SectionCardsProps) {
  const { t } = useTranslation();

  const defaultStatistics: StatisticCardProps[] = [
    {
      title: "eventViews",
      value: "52,340",
      description: t("dashboard.cards.eventViews"),
      trend: 23,
      footer: {
        label: t("dashboard.cards.strongVisibility"),
        description: t("dashboard.cards.eventsAppearedToUsers"),
      },
    },
    {
      title: "bookmarksSaved",
      value: "4,287",
      description: t("dashboard.cards.bookmarksSaved"),
      trend: -18,
      footer: {
        label: t("dashboard.cards.highInterest"),
        description: t("dashboard.cards.viewersSavedEvents"),
      },
    },
    {
      title: "interestedPlanningToAttend",
      value: "3,412",
      description: t("dashboard.cards.interestedPlanningToAttend"),
      trend: 15,
      footer: {
        label: t("dashboard.cards.strongEngagement"),
        description: t("dashboard.cards.bookmarksConvertedToInterest"),
      },
    },
    {
      title: "ticketConversionRate",
      value: "3.8%",
      description: t("dashboard.cards.ticketConversionRate"),
      trend: 0.4,
      footer: {
        label: t("dashboard.cards.aboveAverage"),
        description: t("dashboard.cards.ticketsSoldFromViews"),
      },
    },
    {
      title: "guestProfile.title",
      value: "34",
      description: t("dashboard.guestProfile.description"),
      trend: 0.4,
      footer: {
        label: t("dashboard.guestProfile.label"),
        description: t("dashboard.guestProfile.description"),
      },
    },
  ];

  const stats = statistics || defaultStatistics;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-5">
      {stats.map((stat, index) => (
        <StatisticCard key={stat.title || index} {...stat} />
      ))}
    </div>
  );
}
