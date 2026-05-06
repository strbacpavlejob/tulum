"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import "../../../../i18n";

import { Button } from "@/components/ui/button";
import Logo from "@/components/common/logo";
import LanguageSelector from "@/components/common/language-selector";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function AuthPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 h-full w-full [background:radial-gradient(125%_125%_at_50%_10%,var(--background)_40%,var(--primary)_100%)]"></div>

      {/* Language and Theme Toggles - Top Right */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <AnimatedThemeToggler />
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md relative">
        {/* Back button */}
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 gap-2 text-muted-foreground hover:text"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("auth.backToHome")}
          </Button>
        </Link>

        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Logo className="fill-secondary h-12 w-12" />
          <div className="text-center">
            <h1 className="text-2xl font-semibold text">
              {t("auth.welcomeTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("auth.welcomeSubtitle")}
            </p>
          </div>
        </div>

        {/* Clerk Sign In Component */}
        <SignIn
          appearance={{
            variables: {
              colorPrimary: "hsl(var(--primary))",
              colorBackground: "hsl(var(--card))",
              colorText: "hsl(var(--foreground))",
              colorTextSecondary: "hsl(var(--muted-foreground))",
              colorInputBackground: "hsl(var(--background))",
              colorInputText: "hsl(var(--foreground))",
              borderRadius: "0.5rem",
            },
            elements: {
              headerTitle: { display: "none" },
              rootBox: "mx-auto w-full",
              card: "shadow-lg",
              headerSubtitle: "text-sm",
              socialButtonsBlockButton:
                "border hover:bg-accent/50 transition-colors",
              socialButtonsBlockButtonText: "font-normal",
              formButtonPrimary:
                "bg-primary hover:bg-primary/90 normal-case shadow-sm",
              formFieldInput: "border focus:ring-2 focus:ring-primary/20",
              formFieldLabel: "text-sm font-medium",
              footerActionLink: "hover:underline underline-offset-4",
              identityPreviewEditButton: "hover:underline",
              formFieldInputShowPasswordButton: "hover:text-foreground",
              dividerLine: "bg-border",
              dividerText: "text-xs",
              otpCodeFieldInput: "border focus:ring-2 focus:ring-primary/20",
              formResendCodeLink: "hover:underline underline-offset-4",
              formFieldError: "text-sm",
            },
            options: {
              logoImageUrl: undefined,
              logoPlacement: "none",
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
