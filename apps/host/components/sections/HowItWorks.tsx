"use client";

import { Calendar, MapPin, LineChart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function HowItWorks() {
  const { t } = useTranslation();

  const steps = [
    {
      step: "01",
      icon: <Calendar className="h-12 w-12 text-secondary" />,
      title: t("landingpage.howItWorks.step1.title"),
      description: t("landingpage.howItWorks.step1.description"),
    },
    {
      step: "02",
      icon: <MapPin className="h-12 w-12 text-secondary" />,
      title: t("landingpage.howItWorks.step2.title"),
      description: t("landingpage.howItWorks.step2.description"),
    },
    {
      step: "03",
      icon: <LineChart className="h-12 w-12 text-secondary" />,
      title: t("landingpage.howItWorks.step3.title"),
      description: t("landingpage.howItWorks.step3.description"),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-6 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("landingpage.howItWorks.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("landingpage.howItWorks.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="text-center">
                <div
                  className={cn(
                    "inline-block mb-6 bg-card rounded-2xl p-6 shadow-lg",
                    "group relative justify-between overflow-hidden rounded-xl items-center mb-4",
                    // light styles
                    "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
                    // dark styles
                    "dark:bg-background transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
                  )}
                >
                  <div className="p-6 flex justify-center items-center w-full">
                    {step.icon}
                  </div>
                </div>

                <div className="absolute top-6 left-0 text-7xl font-bold text-secondary-100 -z-10">
                  {step.step}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
