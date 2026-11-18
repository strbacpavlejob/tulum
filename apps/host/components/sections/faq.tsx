"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from "react-i18next";

export default function FAQ() {
  const { t } = useTranslation();

  return (
    <section
      id="faq"
      className="flex flex-col items-center justify-center gap-10 pb-10 w-full relative"
    >
      <div className="border-b w-full h-full p-10 md:p-14">
        <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-2">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance">
            {t("landingpage.faq.title")}
          </h2>
          <p className="text-muted-foreground text-center text-balance font-medium">
            {t("landingpage.faq.subtitle")}
          </p>
        </div>
      </div>

      <div className="max-w-3xl w-full mx-auto px-10">
        <Accordion
          type="single"
          collapsible
          className="w-full border-b-0 grid gap-2"
        >
          <AccordionItem
            value="item-1"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q1.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q1.answer")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="item-2"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q2.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q2.answer")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="item-3"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q3.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q3.answer")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="item-4"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q4.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q4.answer")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="item-5"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q5.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q5.answer")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="item-6"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q6.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q6.answer")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="item-7"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q7.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q7.answer")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="item-8"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q8.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q8.answer")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="item-9"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q9.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q9.answer")}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="item-10"
            className="last:border-b-0 border-0 grid gap-2"
          >
            <AccordionTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 text-left text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 border bg-accent border-border rounded-lg px-4 py-3.5 cursor-pointer no-underline hover:no-underline data-[state=open]:ring data-[state=open]:ring-primary/20">
              {t("landingpage.faq.q10.question")}
            </AccordionTrigger>
            <AccordionContent className="overflow-hidden text-sm px-4 text-muted-foreground">
              {t("landingpage.faq.q10.answer")}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
