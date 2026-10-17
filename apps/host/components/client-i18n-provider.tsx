"use client";

import "@/i18n";
import type { ReactNode } from "react";

export default function ClientI18nProvider({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
