"use client";

import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import Logo from "../common/logo";
import LanguageSelector from "../common/language-selector";

interface NavbarCta {
  labelKey: string;
  href: string;
}

interface NavbarProps {
  scrollToSection?: (id: string) => void;
  cta?: NavbarCta | null;
}

export default function Navbar({ scrollToSection, cta }: NavbarProps) {
  const { t } = useTranslation();
  const activeCta =
    cta === undefined
      ? {
          label: t("landingpage.nav.postEvent"),
          href: "/sign-up",
        }
      : cta
        ? { label: t(cta.labelKey), href: cta.href }
        : null;
  const navItems = [
    { id: "map", label: t("landingpage.nav.liveMap") },
    { id: "how-it-works", label: t("landingpage.nav.howItWorks") },
    { id: "pricing", label: t("landingpage.nav.pricing") },
    { id: "faq", label: t("landingpage.nav.faq") },
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    if (scrollToSection) {
      event.preventDefault();
      scrollToSection(id);
    }
    setIsOpen(false);
  };

  return (
    <>
      <header
        className={
          isScrolled
            ? "fixed left-0 right-0 z-50 mx-4 flex justify-center transition-all duration-300 md:mx-0 top-6"
            : "fixed left-0 right-0 z-50 flex justify-center transition-all duration-300 md:mx-0 top-4 mx-0"
        }
      >
        <div className="mx-auto w-full max-w-6xl px-4">
          <div
            className={
              isScrolled
                ? "mx-auto max-w-7xl rounded-2xl transition-all duration-300 xl:px-0 px-2 border border-border backdrop-blur-lg bg-background/75"
                : "mx-auto max-w-7xl rounded-2xl transition-all duration-300 xl:px-0 shadow-none px-7"
            }
          >
            <div className="flex h-[56px] items-center justify-between gap-4 p-4">
              <div className="flex shrink-0 items-center gap-3">
                <Logo className="fill-[var(--secondary)] h-6 w-6" />
                <span className="text-lg font-semibold text-neutral">
                  Tulum
                </span>
              </div>

              <div className="hidden min-w-0 flex-1 md:block">
                <ul className="relative mx-auto flex w-fit rounded-full h-11 px-2 items-center justify-center">
                  {navItems.map((item) => (
                    <li
                      key={item.id}
                      className="z-10 cursor-pointer h-full flex items-center justify-center px-4 py-2"
                    >
                      <a
                        href={`#${item.id}`}
                        onClick={(event) => handleNavClick(event, item.id)}
                        className="text-sm font-medium transition-colors duration-200 text-neutral/60 hover:text-secondary/80 hover:cursor-pointer tracking-tight"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-row items-center gap-1 md:gap-3 shrink-0">
                {activeCta && (
                  <Button
                    asChild
                    className="bg-primary h-8 hidden md:flex w-auto shrink-0 items-center justify-center whitespace-nowrap px-4 text-sm font-normal tracking-wide rounded-full text-white dark:text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-primary/80 transition-all ease-out active:scale-95 cursor-pointer"
                  >
                    <Link href={activeCta.href}>
                      {activeCta.label}
                    </Link>
                  </Button>
                )}
                <AnimatedThemeToggler />
                <LanguageSelector />

                <button
                  onClick={() => setIsOpen(true)}
                  className="md:hidden border border-border size-8 rounded-md cursor-pointer flex items-center justify-center"
                  aria-label={t("landingpage.nav.openNavigation")}
                  aria-expanded={isOpen}
                  aria-controls="guest-mobile-navigation"
                >
                  <Menu className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Modal */}
      {isOpen && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          <div
            id="guest-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label={t("landingpage.nav.mobileMenu")}
            className="fixed inset-x-0 w-[95%] mx-auto bottom-3 bg-background border border-border p-4 rounded-xl shadow-lg z-50 md:hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Logo className="fill-[var(--secondary)] h-7 w-7" />
                  <span className="text-lg font-semibold text-neutral">
                    Tulum
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="border border-border rounded-md p-1 cursor-pointer"
                  aria-label={t("landingpage.nav.closeNavigation")}
                >
                  <X className="size-5" />
                </button>
              </div>

              <ul className="mb-4 flex flex-col rounded-md border border-border text-sm">
                {navItems.map((item) => (
                  <li
                    key={item.id}
                    className="border-b border-border p-2.5 last:border-b-0"
                  >
                    <a
                      href={`#${item.id}`}
                      onClick={(event) => handleNavClick(event, item.id)}
                      className="block w-full text-left font-medium text-neutral/60 transition-colors hover:text-neutral/80"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2">
                {activeCta && (
                  <Button
                    asChild
                    className="bg-primary h-8 flex items-center justify-center text-sm-white font-normal tracking-wide rounded-full text-background dark:text-secondary-foreground w-full px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-primary/80 transition-all ease-out active:scale-95"
                  >
                    <Link href={activeCta.href}>{activeCta.label}</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
