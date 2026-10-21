import type { Metadata } from "next";
import PublicInfoPage from "@/components/sections/PublicInfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Tulum",
  description: "Learn how Tulum handles information in its app and services.",
};

export default function PrivacyPage() {
  return <PublicInfoPage page="privacy" />;
}
