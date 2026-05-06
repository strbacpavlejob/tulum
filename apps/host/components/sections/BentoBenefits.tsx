"use client";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { useTranslation } from "react-i18next";

import {
  CalendarIcon,
  FileTextIcon,
  MagicWandIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { BarChart3, BellIcon, Share2Icon, Zap } from "lucide-react";

import { AnimatedListDemo } from "../animated-list-demo";
import { AnimatedBeamDemo } from "../animated-beam-multiple-output-demo";
import { Calendar } from "../ui/calendar";
import FilesBento from "../files-bento";
import { AnimatedChart } from "./bento/AnimatedChart";
import BoostedEvent from "../boosted-event";

export default function BentoBenefits() {
  const { t } = useTranslation();

  const features = [
    {
      Icon: FileTextIcon,
      name: t("landingpage.features.saveStatistics.title"),
      description: t("landingpage.features.saveStatistics.description"),
      href: "#",
      cta: t("landingpage.features.saveStatistics.cta"),
      className: "col-span-3 lg:col-span-1",
      background: <FilesBento />,
    },
    {
      Icon: BellIcon,
      name: t("landingpage.features.notifications.title"),
      description: t("landingpage.features.notifications.description"),
      href: "#",
      cta: t("landingpage.features.notifications.cta"),
      className: "col-span-3 lg:col-span-2",
      background: (
        <AnimatedListDemo className="absolute top-4 right-2 h-[300px] w-full scale-75 border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90" />
      ),
    },
    {
      Icon: BarChart3,
      name: t("landingpage.features.statistics.title"),
      description: t("landingpage.features.statistics.description"),
      className: "col-span-3 lg:col-span-1",
      href: "#",
      cta: t("landingpage.features.statistics.cta"),
      background: (
        <AnimatedChart className="absolute top-4 right-2 h-[300px] w-full scale-75 border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90" />
      ),
    },
    {
      Icon: Share2Icon,
      name: t("landingpage.features.newGuests.title"),
      description: t("landingpage.features.newGuests.description"),
      href: "#",
      cta: t("landingpage.features.newGuests.cta"),
      className: "col-span-3 lg:col-span-2",
      background: (
        <AnimatedBeamDemo className="absolute top-4 right-2 h-[300px] border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-105" />
      ),
    },
    {
      Icon: CalendarIcon,
      name: t("landingpage.features.visibility.title"),
      description: t("landingpage.features.visibility.description"),
      className: "col-span-3 lg:col-span-1",
      href: "#",
      cta: t("landingpage.features.visibility.cta"),
      background: (
        <Calendar
          mode="single"
          selected={new Date(2022, 4, 11, 0, 0, 0)}
          className="absolute top-10 right-0 origin-top scale-75 rounded-md border [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90"
        />
      ),
    },
    {
      Icon: Zap,
      name: t("landingpage.features.management.title"),
      description: t("landingpage.features.management.description"),
      className: "col-span-3 lg:col-span-1",
      href: "#",
      cta: t("landingpage.features.management.cta"),
      background: <BoostedEvent />,
    },
  ];

  return (
    <section id="features" className="py-20 px-6 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-secondary mb-4">
            {t("landingpage.features.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("landingpage.features.subtitle")}
          </p>
        </div>
        <BentoGrid>
          {features.map((feature, idx) => (
            <BentoCard key={idx} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
