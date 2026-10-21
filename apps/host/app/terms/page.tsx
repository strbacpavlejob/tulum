import type { Metadata } from "next";
import PublicInfoPage from "@/components/sections/PublicInfoPage";

export const metadata: Metadata = {
  title: "Terms of Service | Tulum",
  description: "Terms for using Tulum's event discovery and social services.",
};

export default function TermsPage() {
  return <PublicInfoPage page="terms" />;
}
