"use client";

import { useTranslation } from "react-i18next";
import Logo from "../common/logo";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ArrowIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
  >
    <path
      d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

export default function Footer() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const heroTarget = pathname === "/host" ? "#hero" : "#hero-guest";
  const productLinks = [
    { href: "#map", label: t("landingpage.nav.liveMap") },
    { href: "#how-it-works", label: t("landingpage.nav.howItWorks") },
    { href: "#pricing", label: t("landingpage.nav.pricing") },
    { href: "#faq", label: t("landingpage.nav.faq") },
  ];
  const socialLinks = [
    { href: "https://www.instagram.com/tulum_app/", label: "Instagram" },
    { href: "https://www.tiktok.com/@tulum.app", label: "TikTok" },
  ];
  const legalLinks = [
    {
      href: "/privacy-policy",
      label: t("landingpage.legal.privacyPolicy"),
    },
    {
      href: "/terms-of-service",
      label: t("landingpage.legal.termsOfService"),
    },
  ];

  return (
    <footer id="footer" className="w-full border-t border-border">
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 p-8 sm:p-10 lg:grid-cols-4">
        <div className="col-span-2 flex max-w-xs flex-col items-start justify-start gap-y-5 lg:col-span-1">
          <Link className="flex items-center gap-2" href={heroTarget}>
            <Logo className="h-8 w-8 text-secondary" />
            <p className="text-xl font-semibold text-secondary">Tulum</p>
          </Link>
          <p className="tracking-tight text-muted-foreground font-medium">
            {t("landingpage.footer.tagline")}
          </p>
        </div>

        <nav aria-label={t("landingpage.footer.product")}>
          <p className="mb-3 text-sm font-semibold text-secondary">
            {t("landingpage.footer.product")}
          </p>
          <ul className="flex flex-col gap-y-2">
            {productLinks.map((item) => (
              <li
                key={item.href}
                className="group inline-flex items-center justify-start gap-1 text-[15px]/snug text-muted-foreground"
              >
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
                <span
                  aria-hidden="true"
                  className="flex size-4 translate-x-0 items-center justify-center rounded border border-border opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100"
                >
                  <ArrowIcon />
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("landingpage.footer.social")}>
          <p className="mb-3 text-sm font-semibold text-secondary">
            {t("landingpage.footer.social")}
          </p>
          <ul className="flex flex-col gap-y-2">
            {socialLinks.map((item) => (
              <li
                key={item.href}
                className="group inline-flex items-center justify-start gap-1 text-[15px]/snug text-muted-foreground"
              >
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
                <span
                  aria-hidden="true"
                  className="flex size-4 translate-x-0 items-center justify-center rounded border border-border opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100"
                >
                  <ArrowIcon />
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("landingpage.footer.legal")}>
          <p className="mb-3 text-sm font-semibold text-secondary">
            {t("landingpage.footer.legal")}
          </p>
          <ul className="flex flex-col gap-y-2">
            {legalLinks.map((item) => (
              <li
                key={item.href}
                className="group inline-flex items-center justify-start gap-1 text-[15px]/snug text-muted-foreground"
              >
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
                <span
                  aria-hidden="true"
                  className="flex size-4 translate-x-0 items-center justify-center rounded border border-border opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100"
                >
                  <ArrowIcon />
                </span>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
