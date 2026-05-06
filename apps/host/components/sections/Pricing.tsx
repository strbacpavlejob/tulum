"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

export default function Pricing() {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  const pricingPlans = [
    {
      name: t("landingpage.pricing.basic.name"),
      monthlyPrice: 59,
      yearlyPrice: 590,
      description: t("landingpage.pricing.basic.description"),
      features: t("landingpage.pricing.basic.features", {
        returnObjects: true,
      }) as string[],
      cta: t("landingpage.pricing.startButton"),
      popular: false,
    },
    {
      name: t("landingpage.pricing.medium.name"),
      monthlyPrice: 99,
      yearlyPrice: 990,
      description: t("landingpage.pricing.medium.description"),
      features: t("landingpage.pricing.medium.features", {
        returnObjects: true,
      }) as string[],
      cta: t("landingpage.pricing.startButton"),
      popular: true,
    },
    {
      name: t("landingpage.pricing.premium.name"),
      monthlyPrice: 159,
      yearlyPrice: 1590,
      description: t("landingpage.pricing.premium.description"),
      features: t("landingpage.pricing.premium.features", {
        returnObjects: true,
      }) as string[],
      cta: t("landingpage.pricing.startButton"),
      popular: false,
    },
  ];

  return (
    <section
      id="pricing"
      className="flex flex-col items-center justify-center gap-10 pb-10 w-full relative"
    >
      <div className="border-b w-full h-full p-10 md:p-14">
        <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-2">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance">
            {t("landingpage.pricing.title")}
          </h2>
          <p className="text-muted-foreground text-center text-balance font-medium">
            {t("landingpage.pricing.subtitle")}
          </p>
        </div>
      </div>

      <div className="relative w-full h-full">
        <div className="absolute -top-14 left-1/2 -translate-x-1/2">
          <div className="relative flex w-fit items-center rounded-full border p-0.5 backdrop-blur-sm cursor-pointer h-9 flex-row bg-muted mx-auto">
            <button
              onClick={() => setBillingCycle("monthly")}
              className="relative px-2 h-8 flex items-center justify-center cursor-pointer z-0"
            >
              {billingCycle === "monthly" && (
                <motion.div
                  layoutId="pricing-toggle"
                  className="absolute inset-0 rounded-full bg-white dark:bg-[#3F3F46] shadow-md border border-border"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span
                className={`relative block text-sm font-medium duration-200 shrink-0 ${
                  billingCycle === "monthly"
                    ? "text-secondary"
                    : "text-muted-foreground"
                }`}
              >
                {t("landingpage.pricing.monthly")}
              </span>
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className="relative z-[1] px-2 h-8 flex items-center justify-center cursor-pointer"
            >
              {billingCycle === "yearly" && (
                <motion.div
                  layoutId="pricing-toggle"
                  className="absolute inset-0 rounded-full bg-white dark:bg-[#3F3F46] shadow-md border border-border"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span
                className={`relative block text-sm font-medium duration-200 shrink-0 ${
                  billingCycle === "yearly"
                    ? "text-secondary"
                    : "text-muted-foreground"
                }`}
              >
                {t("landingpage.pricing.yearly")}
                <span className="ml-2 text-xs font-semibold text-primary bg-primary/15 py-0.5 w-[calc(100%+1rem)] px-1 rounded-full">
                  {t("landingpage.pricing.yearlyBadge")}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="grid min-[650px]:grid-cols-2 min-[900px]:grid-cols-3 gap-4 w-full max-w-6xl mx-auto px-6 items-stretch">
          {pricingPlans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-xl grid grid-rows-[180px_1fr_auto] relative h-full ${
                plan.popular
                  ? "md:shadow-[0px_61px_24px_-10px_rgba(0,0,0,0.01),0px_34px_20px_-8px_rgba(0,0,0,0.05),0px_15px_15px_-6px_rgba(0,0,0,0.09),0px_4px_8px_-2px_rgba(0,0,0,0.10),0px_0px_0px_1px_rgba(0,0,0,0.08)] bg-accent"
                  : "bg-[#F3F4F6] dark:bg-[#F9FAFB]/[0.02] border border-border"
              }`}
            >
              {/* Header */}
              <div className="flex flex-col gap-4 p-4">
                <p className="text-sm">
                  {plan.name}
                  {plan.popular && (
                    <span className="bg-gradient-to-b from-primary-200 from-[1.92%] to-primary to-[100%] text-white h-6 inline-flex w-fit items-center justify-center px-2 rounded-full text-sm ml-2 shadow-[0px_6px_6px_-3px_rgba(0,0,0,0.08),0px_3px_3px_-1.5px_rgba(0,0,0,0.08),0px_1px_1px_-0.5px_rgba(0,0,0,0.08),0px_0px_0px_1px_rgba(255,255,255,0.12)_inset,0px_1px_0px_0px_rgba(255,255,255,0.12)_inset]">
                      {t("landingpage.pricing.mostPopular")}
                    </span>
                  )}
                </p>
                <div className="flex items-baseline mt-2">
                  <motion.span
                    key={billingCycle}
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.3 }}
                    className="text-4xl font-semibold"
                  >
                    {billingCycle === "monthly"
                      ? plan.monthlyPrice
                      : Math.floor(plan.yearlyPrice / 12)}
                    €
                  </motion.span>
                  <span className="ml-2">
                    /{t("landingpage.pricing.perMonth")}
                  </span>
                </div>
                <p className="text-sm mt-2">{plan.description}</p>
              </div>

              {/* Features List */}
              <div className="flex flex-col">
                <hr className="border-border dark:border-white/20" />
                <div className="p-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIdx) => (
                      <li key={featureIdx} className="flex items-center gap-2">
                        <div
                          className={`size-5 rounded-full border flex items-center justify-center ${
                            plan.popular
                              ? "bg-muted-foreground/40 border-border"
                              : "border-secondary/20"
                          }`}
                        >
                          <div className="size-3 flex items-center justify-center">
                            <svg
                              width="8"
                              height="7"
                              viewBox="0 0 8 7"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="block dark:hidden"
                            >
                              <path
                                d="M1.5 3.48828L3.375 5.36328L6.5 0.988281"
                                stroke="#101828"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <svg
                              width="8"
                              height="7"
                              viewBox="0 0 8 7"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="hidden dark:block"
                            >
                              <path
                                d="M1.5 3.48828L3.375 5.36328L6.5 0.988281"
                                stroke="#FAFAFA"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col gap-2 p-4">
                <button
                  className={`h-10 w-full flex items-center justify-center text-sm font-normal tracking-wide rounded-full px-4 cursor-pointer transition-all ease-out active:scale-95 ${
                    plan.popular
                      ? "bg-primary text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)]"
                      : "bg-accent text-secondary shadow-[0px_1px_2px_0px_rgba(255,255,255,0.16)_inset,0px_3px_3px_-1.5px_rgba(16,24,40,0.24),0px_1px_1px_-0.5px_rgba(16,24,40,0.20)]"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
