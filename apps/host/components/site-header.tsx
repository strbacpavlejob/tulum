"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import LanguageSelector from "@/components/common/language-selector";
import { useTranslation } from "react-i18next";
import { usePathname } from "next/navigation";
import "../i18n";

export function SiteHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();

  const getPageTitle = () => {
    switch (pathname) {
      case "/dashboard":
        return t("dashboard.navigation.statistics") || "Statistics";
      case "/venues":
        return t("dashboard.navigation.venues") || "Venues";
      case "/events":
        return t("dashboard.navigation.events") || "Events";
      case "/login":
        return "Login";
      default:
        return t("dashboard.header.documents");
    }
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{getPageTitle()}</h1>
        <div className="ml-auto flex items-center gap-2">
          <AnimatedThemeToggler />
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
