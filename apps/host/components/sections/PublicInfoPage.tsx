"use client";

import "@/i18n";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import Logo from "@/components/common/logo";
import {
  getPublicPageCopy,
  SUPPORT_EMAIL,
  type PublicPageId,
} from "@/lib/public-pages-copy";

const pageLinks: { page: PublicPageId; href: string; labelKey: string }[] = [
  {
    page: "terms",
    href: "/terms",
    labelKey: "landingpage.legal.termsOfService",
  },
  {
    page: "privacy",
    href: "/privacy",
    labelKey: "landingpage.legal.privacyPolicy",
  },
  {
    page: "support",
    href: "/support",
    labelKey: "landingpage.footer.support",
  },
];

export default function PublicInfoPage({ page }: { page: PublicPageId }) {
  const { i18n, t } = useTranslation();
  const copy = getPublicPageCopy(
    i18n.resolvedLanguage ?? i18n.language,
    page,
  );

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/guest"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <Logo className="size-7 text-secondary" />
            <span>{t("auth.backToHome")}</span>
          </Link>

          <nav
            aria-label={t("landingpage.footer.legalAndSupport")}
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
          >
            {pageLinks.map((item) => (
              <Link
                key={item.page}
                href={item.href}
                aria-current={page === item.page ? "page" : undefined}
                className={
                  page === item.page
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </header>

        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold text-primary">
            {page === "support"
              ? t("landingpage.footer.support")
              : t("landingpage.footer.legal")}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.title}
          </h1>
          {copy.updated && (
            <p className="mt-3 text-sm text-muted-foreground">
              {copy.updated}
            </p>
          )}
          <p className="mt-5 max-w-3xl leading-relaxed text-muted-foreground">
            {copy.intro}
          </p>

          <div className="mt-8 divide-y divide-border">
            {copy.sections.map((section, index) => (
              <section
                key={section.title}
                className={index === 0 ? "py-6 pt-0" : "py-6"}
              >
                <h2 className="text-lg font-semibold tracking-tight">
                  {section.title}
                </h2>
                <p className="mt-2 leading-7 text-muted-foreground">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <section className="mt-2 rounded-2xl border border-border bg-muted/40 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-primary">
                <Mail aria-hidden="true" className="size-4" />
              </span>
              <div>
                <h2 className="font-semibold">{copy.contactTitle}</h2>
                <p className="mt-1 leading-6 text-muted-foreground">
                  {copy.contactBody}
                </p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mt-3 inline-flex font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
