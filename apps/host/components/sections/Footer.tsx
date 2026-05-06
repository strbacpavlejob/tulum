"use client";

import { useTranslation } from "react-i18next";
import Logo from "../common/logo";
import Link from "next/link";

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

  return (
    <footer id="footer" className="w-full pb-0">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-10">
        <div className="flex flex-col items-start justify-start gap-y-5 max-w-xs mx-0">
          <Link className="flex items-center gap-2" href="/">
            <Logo className="h-8 w-8 text-secondary" />
            <p className="text-xl font-semibold text-secondary">Tulum</p>
          </Link>
          <p className="tracking-tight text-muted-foreground font-medium">
            {t("landingpage.footer.tagline")}
          </p>
        </div>

        <div className="pt-5 md:w-1/2">
          <div className="flex flex-col items-start justify-start md:flex-row md:items-start md:justify-between gap-y-5 lg:pl-10">
            <ul className="flex flex-col gap-y-2">
              <li className="mb-2 text-sm font-semibold text-secondary">
                {t("landingpage.footer.company")}
              </li>
              <li className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground">
                <Link href="#">{t("landingpage.footer.about")}</Link>
                <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                  <ArrowIcon />
                </div>
              </li>
              <li className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground">
                <Link href="#">{t("landingpage.footer.contact")}</Link>
                <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                  <ArrowIcon />
                </div>
              </li>
            </ul>

            <ul className="flex flex-col gap-y-2">
              <li className="mb-2 text-sm font-semibold text-secondary">
                {t("landingpage.footer.product")}
              </li>
              <li className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground">
                <Link href="#">{t("landingpage.footer.livemap")}</Link>
                <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                  <ArrowIcon />
                </div>
              </li>
              <li className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground">
                <Link href="#features">{t("landingpage.footer.benefits")}</Link>
                <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                  <ArrowIcon />
                </div>
              </li>
              <li className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground">
                <Link href="#pricing">{t("landingpage.footer.pricing")}</Link>
                <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                  <ArrowIcon />
                </div>
              </li>
            </ul>

            <ul className="flex flex-col gap-y-2">
              <li className="mb-2 text-sm font-semibold text-secondary">
                {t("landingpage.footer.support")}
              </li>
              <li className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground">
                <Link href="#">{t("landingpage.footer.helpCenter")}</Link>
                <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                  <ArrowIcon />
                </div>
              </li>
              <li className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground">
                <Link href="#">{t("landingpage.footer.terms")}</Link>
                <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                  <ArrowIcon />
                </div>
              </li>
              <li className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground">
                <Link href="#">Instagram</Link>
                <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                  <ArrowIcon />
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
