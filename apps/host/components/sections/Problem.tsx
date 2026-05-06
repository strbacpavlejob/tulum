"use client";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { Users, TrendingUp, Eye, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Problem() {
  const { t } = useTranslation();

  const problems = [
    {
      name: t("landingpage.problem.unpredictable.title"),
      description: t("landingpage.problem.unpredictable.description"),
      href: "#",
      cta: "Learn more",
      className: "lg:col-span-3 lg:row-span-1",
      background: <div />,
      Icon: Users,
    },
    {
      name: t("landingpage.problem.reachDecline.title"),
      description: t("landingpage.problem.reachDecline.description"),
      href: "#",
      cta: "Learn more",
      className: "lg:col-span-3 lg:row-span-1",
      background: <div />,
      Icon: TrendingUp,
    },
    {
      name: t("landingpage.problem.noInsights.title"),
      description: t("landingpage.problem.noInsights.description"),
      href: "#",
      cta: "Learn more",
      className: "lg:col-span-3 lg:row-span-1",
      background: <div />,
      Icon: Eye,
    },
    {
      name: t("landingpage.problem.risk.title"),
      description: t("landingpage.problem.risk.description"),
      href: "#",
      cta: "Learn more",
      className: "lg:col-span-3 lg:row-span-1",
      background: <div />,
      Icon: Target,
    },
  ];

  return (
    <section className="py-20 px-6 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("landingpage.problem.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("landingpage.problem.subtitle")}
          </p>
        </div>

        <BentoGrid className="lg:grid-rows-2 lg:grid-cols-6">
          {problems.map((problem) => (
            <BentoCard key={problem.name} {...problem} />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
