"use client";

import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import Logo from "../common/logo";
import LanguageSelector from "../common/language-selector";

interface NavbarProps {
  scrollToSection: (id: string) => void;
}

export default function Navbar({ scrollToSection }: NavbarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (id: string) => {
    scrollToSection(id);
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
        <div style={{ width: "800px" }}>
          <div
            className={
              isScrolled
                ? "mx-auto max-w-7xl rounded-2xl transition-all duration-300 xl:px-0 px-2 border border-border backdrop-blur-lg bg-background/75"
                : "mx-auto max-w-7xl rounded-2xl transition-all duration-300 xl:px-0 shadow-none px-7"
            }
          >
            <div className="flex h-[56px] items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Logo className="fill-[var(--secondary)] h-6 w-6" />
                <span className="text-lg font-semibold text-neutral">
                  Tulum
                </span>
              </div>

              <div className="w-full hidden md:block">
                <ul className="relative mx-auto flex w-fit rounded-full h-11 px-2 items-center justify-center">
                  {[
                    { id: "features", label: "landingpage.nav.benefits" },
                    { id: "how-it-works", label: "landingpage.nav.howItWorks" },
                    { id: "pricing", label: "landingpage.nav.pricing" },
                  ].map((item) => (
                    <li
                      key={item.id}
                      className="z-10 cursor-pointer h-full flex items-center justify-center px-4 py-2"
                    >
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className="text-sm font-medium transition-colors duration-200 text-neutral/60 hover:text-secondary/80 hover:cursor-pointer tracking-tight"
                      >
                        {t(item.label)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-row items-center gap-1 md:gap-3 shrink-0">
                <Link href="/sign-up">
                  <Button className="bg-primary h-8 hidden md:flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-white dark:text-white w-full px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-primary/80 transition-all ease-out active:scale-95 cursor-pointer">
                    {t("landingpage.nav.postEvent")}
                  </Button>
                </Link>
                <AnimatedThemeToggler />
                <LanguageSelector />

                <button
                  onClick={() => setIsOpen(true)}
                  className="md:hidden border border-border size-8 rounded-md cursor-pointer flex items-center justify-center"
                >
                  <Menu className="size-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 w-[95%] mx-auto bottom-3 bg-background border border-border p-4 rounded-xl shadow-lg z-50 md:hidden"
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
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <ul className="flex flex-col text-sm mb-4 border border-border rounded-md">
                  <li className="p-2.5 border-b border-border last:border-b-0">
                    <button
                      onClick={() => handleNavClick("features")}
                      className="underline-offset-4 hover:text-neutral/80 transition-colors text-neutral/60 w-full text-left font-medium"
                    >
                      {t("landingpage.nav.benefits")}
                    </button>
                  </li>
                  <li className="p-2.5 border-b border-border last:border-b-0">
                    <button
                      onClick={() => handleNavClick("how-it-works")}
                      className="underline-offset-4 hover:text-neutral/80 transition-colors text-neutral/60 w-full text-left font-medium"
                    >
                      {t("landingpage.nav.howItWorks")}
                    </button>
                  </li>
                  <li className="p-2.5 border-b border-border last:border-b-0">
                    <button
                      onClick={() => handleNavClick("pricing")}
                      className="underline-offset-4 hover:text-neutral/80 transition-colors text-neutral/60 w-full text-left font-medium"
                    >
                      {t("landingpage.nav.pricing")}
                    </button>
                  </li>
                </ul>

                <div className="flex flex-col gap-2">
                  <Link href="/sign-up" className="w-full">
                    <Button className="bg-primary h-8 flex items-center justify-center text-sm-white font-normal tracking-wide rounded-full text-background dark:text-secondary-foreground w-full px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-primary/80 transition-all ease-out active:scale-95">
                      {t("landingpage.nav.postEvent")}
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
