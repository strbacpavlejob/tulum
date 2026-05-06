import React from "react";
import { useTranslation } from "react-i18next";

interface MobileStoreButtonProps {
  variant?: "appStore" | "googlePlay";
  link?: string;
}

function MobileStoreButton({ variant, link }: MobileStoreButtonProps) {
  const { t } = useTranslation();
  return (
    <a
      href={link || "#"}
      className="flex items-center shrink-0 gap-2.5 h-12 px-5 rounded-xl bg-background/75 backdrop-blur-sm text-foreground border border-white/15 hover:bg-background/90 hover:border-foreground/30 transition-all active:scale-[0.97] shadow-lg"
    >
      {variant === "appStore" ? (
        <svg
          className="w-6 h-6 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          fill="currentColor"
        >
          <path d="M349.13 136.86c-40.32 0-57.36 19.24-85.44 19.24-28.79 0-50.75-19.1-85.69-19.1-34.2 0-70.67 20.88-93.83 56.45-32.52 50.16-27 144.63 25.67 225.11 18.84 28.81 44 61.12 77 61.47h.6c28.68 0 37.2-18.78 76.67-19h.6c38.88 0 46.68 18.89 75.24 18.89h.6c33-.35 59.51-36.15 78.35-64.85 13.56-20.64 18.6-31 29-54.35-76.19-28.92-88.43-136.93-13.08-178.34-23-28.8-55.32-45.48-85.79-45.48z" />
          <path d="M340.25 32c-24 1.63-52 16.91-68.4 36.86-14.88 18.08-27.12 44.9-22.32 70.91h1.92c25.56 0 51.72-15.39 67-35.11 14.72-18.77 25.88-45.37 21.8-72.66z" />
        </svg>
      ) : (
        <svg
          className="w-6 h-6 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          fill="currentColor"
        >
          <path d="M48 59.49v393a4.33 4.33 0 007.37 3.07L260 256 55.37 56.42A4.33 4.33 0 0048 59.49zM345.8 174L89.22 32.64l-.16-.09c-4.42-2.4-8.62 3.58-5 7.06l201.13 192.32zM84.08 472.39c-3.64 3.48.56 9.46 5 7.06l.16-.09L345.8 338l-60.61-57.95zM449.38 231l-71.65-39.46L310.36 256l67.37 64.43L449.38 281c19.49-10.77 19.49-39.23 0-50z" />
        </svg>
      )}

      <div className="flex flex-col leading-tight text-left shrink-0">
        <span className="text-[9px] font-medium opacity-60 uppercase tracking-wider whitespace-nowrap">
          {t("landingpage.guest.hero.downloadOn")}
        </span>
        <span className="text-[13px] font-semibold whitespace-nowrap">
          {variant === "appStore"
            ? t("landingpage.guest.hero.appStore")
            : t("landingpage.guest.hero.googlePlay")}
        </span>
      </div>
    </a>
  );
}

export default MobileStoreButton;
