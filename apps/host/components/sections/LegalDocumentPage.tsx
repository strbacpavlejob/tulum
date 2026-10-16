"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

const legalDocuments = {
  privacyPolicy: {
    title: "landingpage.legal.privacyPolicy",
    notice: "landingpage.legal.privacyPolicyNotice",
  },
  termsOfService: {
    title: "landingpage.legal.termsOfService",
    notice: "landingpage.legal.termsOfServiceNotice",
  },
};

interface LegalDocumentPageProps {
  document: keyof typeof legalDocuments;
}

export default function LegalDocumentPage({
  document,
}: LegalDocumentPageProps) {
  const { t } = useTranslation();
  const copy = legalDocuments[document];

  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/guest"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("auth.backToHome")}
        </Link>

        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold text-primary">
            {t("landingpage.footer.legal")}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t(copy.title)}
          </h1>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            {t(copy.notice)}
          </p>
        </article>
      </div>
    </main>
  );
}
